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
            // CSP endurecida: removemos 'unsafe-eval' do script-src (XSS surface grande),
            // mas MANTIVEMOS 'unsafe-inline' porque o Next.js 16 injeta scripts inline no
            // HTML da rota (ex: self.__next_f.push) que sao essenciais para a hidratacao.
            // Remover 'unsafe-inline' quebra o React no cliente. Para remove-lo de vez
            // seria necessario middleware com nonce por-request — mudanca futura.
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; media-src 'self';",
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
