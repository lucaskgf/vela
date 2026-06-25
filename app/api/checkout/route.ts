import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // Proteção Anti-Spam de Checkout (Máx 5 por IP por minuto)
    // x-real-ip é o IP real do cliente na Vercel. Fallback: PRIMEIRO IP do x-forwarded-for (não o último, que é o proxy)
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (!checkRateLimit(ip, "checkout", 5, 60)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco!" }, { status: 429 });
    }

    const body = await req.json();
    let { nome, mensagem, comprador, email, dias } = body;

    // Sanitização de Dados (Prevenção contra Data Bloating no MongoDB)
    nome = (nome || "Homenageado").substring(0, 100);
    mensagem = (mensagem || "").substring(0, 500);
    comprador = (comprador || "Anônimo").substring(0, 100);
    email = email ? String(email).substring(0, 100) : null;

    let valor = 5;
    if (dias === 90) valor = 10;
    if (dias === 365) valor = 20;

    const maxAltura = dias <= 30 ? 26 : dias <= 90 ? 40 : 54;

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
        valor,
        dias,
        maxAltura,
      }
    });

    return NextResponse.json({ success: true, id: candle.id });
  } catch (error: any) {
    console.error("Erro ao gerar checkout:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar checkout" },
      { status: 500 }
    );
  }
}
