import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { PLANS_BY_PRODUCT, calcMaxAltura } from "@/lib/hotmart";

export async function POST(req: NextRequest) {
  try {
    const expectedHottok = process.env.HOTMART_HOTTOK;
    const providedHottok = req.headers.get("x-hotmart-hottok") || req.headers.get("hottok");

    if (expectedHottok && providedHottok) {
      if (expectedHottok.length !== providedHottok.length || !crypto.timingSafeEqual(Buffer.from(expectedHottok), Buffer.from(providedHottok))) {
        console.warn("Bloqueado: Requisição webhook não autorizada (hottok inválido).");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (expectedHottok && !providedHottok) {
      console.warn("Bloqueado: Requisição webhook sem hottok.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Logamos apenas o evento (sem PII do comprador) — commit 9454171 havia exposto
    // e-mail/nome nos logs da Vercel, o que é um problema de LGPD em produção.
    console.log("Webhook Hotmart recebido:", body.event);

    // O webhook da Hotmart envia diversos eventos. Só nos interessa quando a compra é aprovada.
    if (body.event === "PURCHASE_APPROVED") {

      // A versão 2.0.0 do webhook da Hotmart encapsula os dados em um objeto "data".
      const eventData = body.data || body;
      const productId = eventData.product?.id?.toString();
      const rawTransactionId = eventData.purchase?.transaction || eventData.transaction || null;
      const transactionId = rawTransactionId ? String(rawTransactionId).substring(0, 255) : null;

      // Proteção de Idempotência (Replay Attack e Corrida)
      if (transactionId) {
        const transacaoExistente = await prisma.candle.findUnique({
          where: { transactionId }
        });
        if (transacaoExistente) {
          console.log(`Transação ${transactionId} já processada. Ignorando Replay Attack.`);
          return NextResponse.json({ success: true, message: "Idempotency catch" });
        }
      }

      // Plano vem da fonte centralizada (hotmart.ts). Se o produto for desconhecido,
      // usamos um fallback conservador em vez de chutar valor/dias.
      const plan = productId ? PLANS_BY_PRODUCT[productId] : undefined;
      const valor = plan?.valor ?? 0;
      const dias = plan?.dias ?? 30;
      const maxAltura = plan?.maxAltura ?? calcMaxAltura(dias);

      // Busca no banco se há uma vela pendente aguardando pagamento deste comprador
      const compradorEmail = eventData.buyer?.email?.toLowerCase();
      const nomeComprador = eventData.buyer?.name || "Anônimo";

      if (compradorEmail) {
        // Pega a vela pendente mais recente desse email
        const velaPendente = await prisma.candle.findFirst({
          where: {
            compradorEmail: compradorEmail,
            status: "PENDENTE"
          },
          orderBy: { criadoEm: "desc" }
        });

        if (velaPendente) {
          // Atualiza a vela para ATIVA e aproveita para salvar o nome oficial que veio da Hotmart.
          // Importante: quando o plano pago difere do plano selecionado no checkout (ex: cliente
          // selecionou 365 mas pagou o produto de 30), confiamos no que foi PAGO (plano do webhook),
          // não no que foi clicado — isso evita ativar uma vela de 365 dias por R$5.
          await prisma.candle.update({
            where: { id: velaPendente.id },
            data: {
              status: "ATIVA",
              comprador: nomeComprador,
              transactionId: transactionId,
              valor: plan?.valor ?? velaPendente.valor,
              dias: plan?.dias ?? velaPendente.dias,
              maxAltura: plan?.maxAltura ?? velaPendente.maxAltura
            }
          });
          console.log(`Vela ${velaPendente.id} ativada! Transação: ${transactionId}`);
        } else {
          // Fallback: se não achar a vela pendente (comprador pagou direto pela Hotmart sem
          // passar pelo site, ou a pendente já expirou/foi consumida), criamos uma vela simples.
          await prisma.candle.create({
            data: {
              nome: nomeComprador,
              mensagem: "Uma luz acesa com fé e gratidão.",
              comprador: nomeComprador,
              compradorEmail: compradorEmail,
              transactionId: transactionId,
              status: "ATIVA",
              valor,
              dias,
              maxAltura
            }
          });
          console.log(`Vela fallback criada. Transação: ${transactionId}`);
        }
      } else {
        console.warn("Webhook PURCHASE_APPROVED sem compradorEmail — impossível relacionar a vela.");
      }
    } else if (
      body.event === "PURCHASE_CANCELED" ||
      body.event === "PURCHASE_REFUNDED" ||
      body.event === "PURCHASE_CHARGEBACK" ||
      body.event === "PURCHASE_PROTEST"
    ) {
      const eventData = body.data || body;
      const rawTransactionId = eventData.purchase?.transaction || eventData.transaction || null;
      const transactionId = rawTransactionId ? String(rawTransactionId).substring(0, 255) : null;

      if (transactionId) {
        await prisma.candle.upsert({
          where: { transactionId },
          update: { status: "CANCELADA" },
          create: {
            nome: "Cancelado",
            comprador: "Cancelado",
            status: "CANCELADA",
            transactionId: transactionId,
            valor: 0,
            dias: 0,
            maxAltura: 0
          }
        });
        console.log(`Vela com transação ${transactionId} foi CANCELADA (Reembolso/Chargeback) ou pre-cancelada por Race Condition.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no Webhook da Hotmart:", error);
    return NextResponse.json(
      { error: "Error al procesar el webhook" },
      { status: 500 }
    );
  }
}
