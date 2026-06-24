import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Webhook Hotmart recebido:", body);

    // O webhook da Hotmart envia diversos eventos. Só nos interessa quando a compra é aprovada.
    if (body.event === "PURCHASE_APPROVED") {
      
      // Lógica para definir o tamanho da vela com base no ID do Produto na Hotmart.
      // Substitua esses IDs "123456" pelos IDs reais que você vai criar lá na plataforma Hotmart.
      const productId = body.product?.id;
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

      // Salvando no MongoDB
      await prisma.candle.create({
        data: {
          nome: body.buyer?.name || "Homenageado", 
          // Se quiser pegar o nome do homenageado e mensagem, você pode usar os "campos personalizados" no checkout da Hotmart
          mensagem: "Uma luz acesa em silêncio, com fé e gratidão.",
          comprador: body.buyer?.name || "Anônimo",
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
