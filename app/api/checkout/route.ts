import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, mensagem, comprador, email, dias } = body;

    let valor = 5;
    if (dias === 15) valor = 10;
    if (dias === 30) valor = 20;

    const maxAltura = dias <= 5 ? 26 : dias <= 15 ? 40 : 54;

    // Criamos a vela como PENDENTE no banco.
    // Quando a Hotmart mandar o webhook, ela vai ser ativada usando o email do comprador.
    const candle = await prisma.candle.create({
      data: {
        nome: nome || "Homenageado",
        mensagem: mensagem || "",
        comprador: comprador || "Anônimo",
        compradorEmail: email,
        status: "PENDENTE",
        valor,
        dias,
        maxAltura,
      }
    });

    return NextResponse.json({ success: true, id: candle.id });
  } catch (error) {
    console.error("Erro ao gerar checkout:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar checkout" },
      { status: 500 }
    );
  }
}
