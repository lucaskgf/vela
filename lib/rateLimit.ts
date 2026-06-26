// Rate limiting distribuído via Upstash Redis, com fallback transparente para o
// cache em memória quando o Redis não está configurado.
//
// Por que Redis: na Vercel (serverless) cada instância tem seu próprio Map em memória,
// então um atacante com concorrência contorna o limite trivialmente. O Redis (Upstash
// tem tier grátis e é edge-friendly) compartilha o contador entre TODAS as instâncias.
//
// Para ativar, defina no .env:
//   UPSTASH_REDIS_REST_URL=...
//   UPSTASH_REDIS_REST_TOKEN=...
// Se não definidos, caímos no cache em memória (comportamento anterior).

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const memoryCache = new Map<string, RateLimitRecord>();

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);

// Pipeline atômico no Redis: INCR + EXPIRE. Retorna true se o contador (após incremento)
// ainda está dentro do limite. Usamos a REST API do Upstash diretamente (sem dep extra).
async function redisCheck(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const url = `${REDIS_URL}/pipeline`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds],
    ]),
    // Cache: nunca cachear respostas de rate limit.
    cache: "no-store",
  });

  if (!res.ok) {
    // Se o Redis falhar, falhamos ABERTO (permitimos) e logamos — preferimos
    // indisponibilidade de proteção a indisponibilidade de serviço.
    console.warn("Rate-limit Redis falhou, permitindo (fail-open).", res.status);
    return true;
  }

  const data = (await res.json()) as Array<{ result?: number }>;
  const count = data?.[0]?.result ?? 0;
  return count <= limit;
}

export async function checkRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `rl:${action}:${ip}`;

  if (hasRedis) {
    try {
      return await redisCheck(key, limit, windowSeconds);
    } catch (e) {
      console.warn("Rate-limit Redis erro, caindo para memória:", e);
    }
  }

  return memoryCheck(key, limit, windowSeconds);
}

// Cache em memória (fallback). Mantém a faxineira automática anti-OOM original.
function memoryCheck(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();

  // Prevenção de Memory Leak (OOM DoS): Faxineiro Automático
  if (memoryCache.size > 5000) {
    for (const [k, v] of memoryCache.entries()) {
      if (now > v.resetAt) {
        memoryCache.delete(k);
      }
    }
    if (memoryCache.size > 5000) {
      memoryCache.clear();
    }
  }

  const record = memoryCache.get(key);

  if (!record || now > record.resetAt) {
    memoryCache.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= limit) {
    return false; // Bloqueado
  }

  record.count++;
  return true;
}
