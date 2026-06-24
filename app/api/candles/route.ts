import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch candles from MongoDB, ordered by creation date (newest first)
    const candles = await prisma.candle.findMany({
      orderBy: {
        criadoEm: 'desc'
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
