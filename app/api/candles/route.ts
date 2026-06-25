import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch candles from MongoDB, ordered by creation date (newest first)
    // Limite de 150 velas simultâneas para proteger a memória do servidor e navegador
    const candles = await prisma.candle.findMany({
      where: { status: "ATIVA" },
      orderBy: {
        criadoEm: 'desc'
      },
      take: 150,
      select: {
        id: true,
        nome: true,
        mensagem: true,
        comprador: true,
        valor: true,
        dias: true,
        maxAltura: true,
        criadoEm: true,
        oracoes: true,
        amens: true,
        rosas: true
        // NOTE: compradorEmail is explicitly excluded for privacy
      }
    });

    return NextResponse.json(candles);
  } catch (error) {
    console.error("Erro ao buscar velas:", error);
    return NextResponse.json(
      { error: "Erro ao carregar o mural" },
      { status: 500 }
    );
  }
}
