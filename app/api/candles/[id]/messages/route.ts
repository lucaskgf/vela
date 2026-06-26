import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const { id } = p;

    // Proteção Anti-Spam (Máx 5 mensagens por IP por minuto)
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, "message", 5, 60))) {
      return NextResponse.json({ error: "Muitas mensagens. Aguarde um pouco!" }, { status: 429 });
    }

    const body = await req.json();
    let { nome, mensagem } = body;

    // Sanitização de Dados (Prevenção contra Data Bloating no MongoDB)
    nome = String(nome || "Anônimo").substring(0, 50);
    mensagem = String(mensagem || "").substring(0, 500);

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
