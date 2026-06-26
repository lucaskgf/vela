import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Agregação real no banco. Antes, o client somava `valor` das 150 velas que recebia
// (por causa do take:150), então "R$ arrecadado" subnotificava o total verdadeiro.
// Esta rota usa prisma.aggregate, que conta/soma sobre TODAS as velas ATIVAS.
export const revalidate = 60; // cache de 1min na edge, igual ao mural

export async function GET() {
  try {
    const [countAgg, sumAgg, last] = await Promise.all([
      prisma.candle.aggregate({ where: { status: "ATIVA" }, _count: { _all: true } }),
      prisma.candle.aggregate({ where: { status: "ATIVA" }, _sum: { valor: true } }),
      prisma.candle.findFirst({
        where: { status: "ATIVA" },
        orderBy: { criadoEm: "desc" },
        select: { nome: true },
      }),
    ]);

    return NextResponse.json({
      count: countAgg._count._all,
      total: sumAgg._sum.valor ?? 0,
      last: last?.nome ?? "—",
    });
  } catch (error) {
    console.error("Erro ao buscar stats:", error);
    return NextResponse.json({ error: "Erro ao carregar estatísticas" }, { status: 500 });
  }
}
