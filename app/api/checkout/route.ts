import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";
import { PLANS, isValidDias } from "@/lib/hotmart";

export async function POST(req: NextRequest) {
  try {
    // Proteção Anti-Spam de Checkout (Máx 5 por IP por minuto)
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, "checkout", 5, 60))) {
      return NextResponse.json({ error: "Demasiados intentos. ¡Espera un poco!" }, { status: 429 });
    }

    const body = await req.json();
    let { nome, mensagem, comprador, email } = body;
    const { dias } = body;

    // Validação centralizada do plano — rejeita dias inválidos ANTES de tocar no banco.
    const diasNum = Number(dias);
    if (!isValidDias(diasNum)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }
    const plan = PLANS[diasNum];

    // CRÍTICO: Se o plano ainda não tem link de checkout configurado, NÃO criamos a vela.
    // Antes deste guard, o fluxo criava uma vela PENDENTE e depois falhava no cliente,
    // deixando centenas de velas órfãs no banco. Agora bloqueamos cedo.
    if (!plan.checkoutUrl) {
      return NextResponse.json(
        { error: "Este plan aún no está disponible para la compra. ¡Pronto!" },
        { status: 409 }
      );
    }

    // Sanitização de Dados (Prevenção contra Data Bloating no MongoDB)
    nome = (nome || "Homenageado").substring(0, 100);
    mensagem = (mensagem || "").substring(0, 500);
    comprador = (comprador || "Anônimo").substring(0, 100);
    email = email ? String(email).substring(0, 100).toLowerCase() : null;

    // Criamos a vela como PENDENTE no banco.
    // Usamos um transactionId temporário pois o MongoDB bloqueia múltiplos campos null com @unique
    const tempTransactionId = `PENDING_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const candle = await prisma.candle.create({
      data: {
        nome: nome,
        mensagem: mensagem,
        comprador: comprador,
        compradorEmail: email,
        status: "PENDENTE",
        transactionId: tempTransactionId,
        valor: plan.valor,
        dias: plan.dias,
        maxAltura: plan.maxAltura,
      }
    });

    return NextResponse.json({ success: true, id: candle.id, checkoutUrl: plan.checkoutUrl });
  } catch (error: unknown) {
    console.error("Erro ao gerar checkout:", error);
    return NextResponse.json(
      { error: "Error al iniciar el checkout" },
      { status: 500 }
    );
  }
}
