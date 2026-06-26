import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

/**
 * Marca como EXPIRADA toda vela ATIVA cujo tempo de queima (dias) já passou.
 *
 * Por que existe: velas expiravam no relógio mas continuavam com status "ATIVA" no
 * banco para sempre, poluindo a collection e fazendo a query do mural ler registros
 * inúteis. Este job zera essa dívida técnica.
 *
 * Como rodar: agende um Vercel Cron (vercel.json) batendo neste endpoint a cada hora.
 * A Vercel injeta automaticamente o header `Authorization: Bearer <CRON_SECRET>` em toda
 * chamada de cron — É UMA CONVENÇÃO DELA. Por isso basta definir a env var `CRON_SECRET`
 * nas settings do projeto; não é preciso configurar o header em nenhum lugar.
 *
 * Em desenvolvimento local (sem CRON_SECRET), chame manualmente passando o header:
 *   curl -H "authorization: Bearer vela-cruz-2026" http://localhost:3000/api/cron/expire
 *
 * Segurança: a rota REJEITA a execução se CRON_SECRET não estiver configurada — nunca
 * deixamos um endpoint administrativo rodando de portas abertas.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");

  // Sem secret configurada, recusamos. Em produção isso nunca acontece se você definiu
  // a env var; em dev local, exporte CRON_SECRET=vela-cruz-2026 antes de testar.
  if (!expected) {
    console.error("[cron/expire] CRON_SECRET não configurada. Abortando por segurança.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // timingSafeEqual previne timing attack na comparação da secret.
  if (!provided || provided.length !== `Bearer ${expected}`.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(`Bearer ${expected}`));
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Busca candidatos: velas ATIVAS. Como não dá pra expressar "agora > criadoEm + dias dias"
    // de forma eficiente só com filtros do Prisma no MongoDB, buscamos as ATIVAS e filtramos
    // a janela em JS. Para escalar, o ideal seria um campo `expiraEm` indexado — ver nota no README.
    const ativas = await prisma.candle.findMany({
      where: { status: "ATIVA" },
      select: { id: true, criadoEm: true, dias: true },
      take: 500, // processamos em lotes para não estourar memória/time.
    });

    const expirarIds = ativas
      .filter((c) => {
        const expiraEm = new Date(c.criadoEm.getTime() + c.dias * 86400000);
        return expiraEm < now;
      })
      .map((c) => c.id);

    if (expirarIds.length === 0) {
      return NextResponse.json({ success: true, expired: 0 });
    }

    const result = await prisma.candle.updateMany({
      where: { id: { in: expirarIds }, status: "ATIVA" },
      data: { status: "EXPIRADA" },
    });

    console.log(`[cron/expire] ${result.count} velas marcadas como EXPIRADA.`);
    return NextResponse.json({ success: true, expired: result.count });
  } catch (error) {
    console.error("[cron/expire] erro:", error);
    return NextResponse.json({ error: "Erro ao expirar velas" }, { status: 500 });
  }
}
