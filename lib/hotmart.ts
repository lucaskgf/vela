// Fonte única de verdade para os produtos da Hotmart.
// Mantém o checkout e o webhook SEMPRE sincronizados — mudar aqui atualiza ambos.
// Antes deste arquivo, os productIds/valores/dias estavam duplicados em 3 lugares
// (route de checkout, route de webhook e a página client), o que causou
// inconsistências e velas PENDENTES órfãs.

export type CandlePlan = {
  dias: number;
  valor: number;
  productId: string;
  maxAltura: number;
  // null = o produto existe na Hotmart, mas o link de checkout ainda não foi gerado.
  // Quando o link for null, o checkout é bloqueado ANTES de criar qualquer vela,
  // evitando velas PENDENTES órfãs no banco.
  checkoutUrl: string | null;
};

export const PLANS: Record<number, CandlePlan> = {
  30: { dias: 30, valor: 5, productId: "7966588", maxAltura: 26, checkoutUrl: "https://pay.hotmart.com/E106403870K" },
  90: { dias: 90, valor: 10, productId: "7998952", maxAltura: 40, checkoutUrl: "https://pay.hotmart.com/J106475954M" },
  365: { dias: 365, valor: 20, productId: "7999044", maxAltura: 54, checkoutUrl: null }, // link ainda não configurado
};

// Índice reverso: productId -> plano (usado pelo webhook)
export const PLANS_BY_PRODUCT: Record<string, CandlePlan> = Object.fromEntries(
  Object.values(PLANS).map((p) => [p.productId, p])
);

export function calcMaxAltura(dias: number): number {
  return dias <= 30 ? 26 : dias <= 90 ? 40 : 54;
}

export function isValidDias(dias: number): dias is keyof typeof PLANS {
  return dias in PLANS;
}
