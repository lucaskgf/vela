type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// Um cache super simples na memória do servidor
// Nota: Em Serverless (Vercel), esse cache pode ser reiniciado a qualquer momento (frio),
// mas é o suficiente para bloquear bots disparando centenas de requisições por segundo
// antes do container esfriar.
const memoryCache = new Map<string, RateLimitRecord>();

export function checkRateLimit(ip: string, action: string, limit: number, windowSeconds: number): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const record = memoryCache.get(key);

  if (!record || now > record.resetAt) {
    // Novo registro ou expirou
    memoryCache.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= limit) {
    return false; // Bloqueado
  }

  record.count++;
  return true;
}
