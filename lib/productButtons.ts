import type { Product, ProductButton } from "@/lib/supabase";
import { buildWaLink } from "@/lib/wa";

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

// Link de um botão de ação: WhatsApp (wa.me com a mensagem do lead) ou link
// direto (personalizado). Usado no resultado e no carrinho do player.
export function ctaButtonHref(btn: ProductButton, message: string): string {
  return btn.kind === "whatsapp" ? buildWaLink(btn.value, message) : btn.value;
}
