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
  title: "La Voz de la Cruz — Enciende una luz de fe",
  description: "La Voz de la Cruz es un memorial digital de fe. Enciende una vela virtual en homenaje a quien amas y ve su luz brillar en el Mural de la Fe.",
  openGraph: {
    title: "La Voz de la Cruz",
    description: "Enciende una luz de fe para quien amas.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${cinzel.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
