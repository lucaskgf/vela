import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const { id } = p;

    // Proteção Anti-Spam (Máx 60 cliques por IP por minuto)
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, "interact", 60, 60))) {
      return NextResponse.json({ error: "Demasiadas interacciones. ¡Ve con calma!" }, { status: 429 });
    }

    const body = await req.json();
    const { type } = body;

    let incrementField = "";
    if (type === "oracao") incrementField = "oracoes";
    else if (type === "amen") incrementField = "amens";
    else if (type === "rosa") incrementField = "rosas";
    else return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const updated = await prisma.candle.update({
      where: { id },
      data: {
        [incrementField]: { increment: 1 }
      }
    });

    return NextResponse.json({ success: true, count: updated[incrementField as keyof typeof updated] });
  } catch (error) {
    console.error("Erro ao interagir com vela:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
