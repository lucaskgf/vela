import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Webhook Hotmart recebido:", body);

    // O webhook da Hotmart envia diversos eventos. Só nos interessa quando a compra é aprovada.
    if (body.event === "PURCHASE_APPROVED") {
      
      // A versão 2.0.0 do webhook da Hotmart encapsula os dados em um objeto "data".
      const eventData = body.data || body;

      // Configuração Padrão (Fallback)
      let valor = 0;
      let dias = 30;
      
      // Mapeamento dos produtos reais da Hotmart
      if (productId === "7999044") {
         valor = 5;
         dias = 5;
      } else if (productId === "7998952") {
         valor = 10;
         dias = 15;
      } else if (productId === "7966588") {
         valor = 20;
         dias = 30;
      }
      
      // Cálculo da altura máxima da chama (dias menores = chama menor)
      const maxAltura = dias <= 5 ? 26 : dias <= 15 ? 40 : 54;
      const nomeComprador = eventData.buyer?.name || "Anônimo";

      // Salvando no MongoDB
      await prisma.candle.create({
        data: {
          nome: nomeComprador, 
          // Se quiser pegar o nome do homenageado e mensagem, você pode usar os "campos personalizados" no checkout da Hotmart
          mensagem: "Uma luz acesa em silêncio, com fé e gratidão.",
          comprador: nomeComprador,
          valor,
          dias,
          maxAltura,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no Webhook da Hotmart:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}
