import type { Product, ProductButton } from "@/lib/supabase";

// =====================================================================
// Botões de ação de um produto no player.
// Regra (decisão do dono): mostra só os botões configurados; se o produto
// não tiver nenhum, e houver "Link" (buy_link), cai para um "Ver produto".
// =====================================================================
export function productCtaButtons(product: Product): ProductButton[] {
  if (product.buttons && product.buttons.length > 0) return product.buttons;
  if (product.buy_link) {
    return [{ kind: "custom", label: "Ver produto", value: product.buy_link }];
  }
  return [];
}
