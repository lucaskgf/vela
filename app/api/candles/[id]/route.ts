import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const { id } = p;
    
    const candle = await prisma.candle.findUnique({
      where: { id },
      include: {
        mensagens: {
          orderBy: { criadoEm: "desc" }
        }
      }
    });

    if (!candle) {
      return NextResponse.json({ error: "Vela não encontrada" }, { status: 404 });
    }

    return NextResponse.json(candle);
  } catch (error) {
    console.error("Erro ao buscar vela:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
