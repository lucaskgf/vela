import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

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
    console.log("Webhook Hotmart recebido:", body);

    // O webhook da Hotmart envia diversos eventos. Só nos interessa quando a compra é aprovada.
    if (body.event === "PURCHASE_APPROVED") {
      
      // A versão 2.0.0 do webhook da Hotmart encapsula os dados em um objeto "data".
      const eventData = body.data || body;
      const productId = eventData.product?.id?.toString();
      let rawTransactionId = eventData.purchase?.transaction || eventData.transaction || null;
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

      // Configuração Padrão (Fallback)
      let valor = 0;
      let dias = 30;
      
      // Mapeamento dos produtos reais da Hotmart
      if (productId === "7966588") {
         valor = 5;
         dias = 30;
      } else if (productId === "7998952") {
         valor = 10;
         dias = 90;
      } else if (productId === "7999044") {
         valor = 20;
         dias = 365;
      }
      
      // Cálculo da altura máxima da chama (dias menores = chama menor)
      const maxAltura = dias <= 30 ? 26 : dias <= 90 ? 40 : 54;

      // Busca no banco se há uma vela pendente aguardando pagamento deste comprador
      const compradorEmail = eventData.buyer?.email;
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
          // Atualiza a vela para ATIVA e aproveita para salvar o nome oficial que veio da Hotmart
          await prisma.candle.update({
            where: { id: velaPendente.id },
            data: { 
              status: "ATIVA",
              comprador: nomeComprador,
              transactionId: transactionId
              // Opcional: atualizar dias/valor caso o que ele pagou na hotmart seja diferente do que clicou, mas vamos manter o da DB.
            }
          });
          console.log(`Vela ${velaPendente.id} ativada com sucesso! Transação: ${transactionId}`);
        } else {
          // Fallback: se não achar a vela pendente (comprador burlou o sistema ou demorou), cria uma vela simples
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
        }
      }
    } else if (
      body.event === "PURCHASE_CANCELED" || 
      body.event === "PURCHASE_REFUNDED" || 
      body.event === "PURCHASE_CHARGEBACK" ||
      body.event === "PURCHASE_PROTEST"
    ) {
      const eventData = body.data || body;
      let rawTransactionId = eventData.purchase?.transaction || eventData.transaction || null;
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
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}
