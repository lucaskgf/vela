import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const { id } = p;
    const body = await req.json();
    const { nome, mensagem } = body;

    if (!nome || !mensagem) {
      return NextResponse.json({ error: "Nome e mensagem são obrigatórios" }, { status: 400 });
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        candleId: id,
        nome: nome.trim(),
        mensagem: mensagem.trim()
      }
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
