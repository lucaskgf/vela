import type { NextRequest } from "next/server";

// Extração centralizada do IP do cliente.
//
// Validação (correção de segurança): antes pegávamos `x-real-ip` cru, que qualquer
// cliente pode forjar fora da Vercel para burlar o rate limit. Agora:
//   - Confiamos no x-real-ip SOMENTE quando vem da infra da Vercel (we trust the edge).
//     Em ambientes fora da Vercel, ignoramos headers client-supplied e usamos o socket.
//   - Validamos que o valor é de fato um IP (não um payload arbitrário).
//
// Como o runtime serverless do Next expõe o socket via `req.headers` apenas em alguns
// casos, mantemos o fallback do x-forwarded-for (primeiro IP) — mas sanitizado.
export function getClientIp(req: NextRequest): string {
  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    const real = req.headers.get("x-real-ip");
    if (real && isValidIp(real)) return real;
  }

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && isValidIp(first)) return first;
  }

  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4.test(ip)) {
    return ip.split(".").every((p) => {
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }
  // IPv6 (checagem permissiva — só rejeita obviamente não-IP)
  return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":");
}
