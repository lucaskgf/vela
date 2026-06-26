import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // CSP endurecida: removemos 'unsafe-eval' do script-src (XSS surface grande).
            // 'unsafe-inline' permanece em style-src por causa dos blocos <style> inline
            // do memorial/noche-de-oracion; em script-src usamos apenas 'self'.
            // Nota: se no futuro houver erros de CSP em produção (ex: eval de alguma lib),
            // reintroduza o nonce via headers() em vez de voltar para 'unsafe-eval'.
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; media-src 'self';",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
