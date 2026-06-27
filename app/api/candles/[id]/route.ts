import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 60; // Cache na Edge (1 min) contra DoS


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const { id } = p;
    
    const candle = await prisma.candle.findUnique({
      where: { id },
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
        rosas: true,
        mensagens: {
          orderBy: { criadoEm: "desc" },
          take: 100
        }
      }
    });

    if (!candle) {
      return NextResponse.json({ error: "Vela no encontrada" }, { status: 404 });
    }

    return NextResponse.json(candle);
  } catch (error) {
    console.error("Erro ao buscar vela:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
