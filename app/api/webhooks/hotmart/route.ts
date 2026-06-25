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

      // Substitua esses IDs pelos IDs reais que você vai criar na plataforma Hotmart.
      const productId = eventData.product?.id?.toString();
      let valor = 5;
      let dias = 30;
      
      if (productId === "ID_PRODUTO_VELA_10") {
         valor = 10;
         dias = 90;
      } else if (productId === "ID_PRODUTO_VELA_20") {
         valor = 20;
         dias = 365;
      }
      
      const maxAltura = dias <= 30 ? 26 : dias <= 90 ? 40 : 54;
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
