import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--serif',
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--sans',
});

export const metadata: Metadata = {
  title: "La Voz de la Cruz — Acenda uma luz de fé",
  description: "La Voz de la Cruz é um memorial digital de fé. Acenda uma vela virtual em homenagem a quem você ama e veja sua luz brilhar no Mural da Fé.",
  openGraph: {
    title: "La Voz de la Cruz",
    description: "Acenda uma luz de fé para quem você ama.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${cinzel.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
