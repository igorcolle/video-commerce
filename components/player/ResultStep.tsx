"use client";

import { useState } from "react";
import type { Step, Product, ProductSpec } from "@/lib/supabase";
import { buildLeadMessage } from "@/lib/wa";
import { productCtaButtons, ctaButtonHref } from "@/lib/productButtons";
import StoryVideo from "./StoryVideo";
import SpecsModal from "./SpecsModal";

// =====================================================================
// ResultStep — tela final: vídeo de recomendação + produtos sugeridos
// com botões de ação configuráveis (WhatsApp / link). É aqui que a
// conversão acontece. Um CTA geral (configurável) pode aparecer no fim.
// Botão de especificações por produto.
// =====================================================================

type Props = {
  step: Step;
  products: Product[];
  productSpecs: ProductSpec[];
  journeyName: string;
  answers: Record<string, string>;
  onWhatsapp: (productId?: string) => void;
  onBuy: (productId: string) => void;
  onSpecs: (productId: string) => void;
  onClose?: () => void;
};

export default function ResultStep({
  step,
  products,
  productSpecs,
  journeyName,
  answers,
  onWhatsapp,
  onBuy,
  onSpecs,
  onClose,
}: Props) {
  // Mais de 4 produtos: a lista rola dentro de uma área com barra minimalista.
  const scroll = products.length > 4;

  // Produto cujas especificações estão abertas no modal.
  const [specsProduct, setSpecsProduct] = useState<Product | null>(null);

  // Um produto tem specs para mostrar quando está ativado e há resumo ou linhas.
  function hasSpecs(p: Product): boolean {
    return (
      p.specs_enabled &&
      (Boolean(p.specs_summary) ||
        productSpecs.some((s) => s.product_id === p.id))
    );
  }

  // CTA geral configurável (botão de ação no fim da tela).
  const cta = step.result_cta ?? null;
  const ctaMsg = buildLeadMessage(
    journeyName,
    answers,
    products.map((p) => p.name)
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      {/* Vídeo final de recomendação (formato stories com controles próprios) */}
      {step.video_url && <StoryVideo src={step.video_url} onClose={onClose} />}

      <h2 className="text-center text-2xl font-bold">
        {step.question_text || "Essas são as melhores opções para você."}
      </h2>

      {/* Cartões de produto (rolável quando há mais de 4) */}
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
          scroll ? "scrollbar-thin max-h-[70vh] overflow-y-auto pr-1" : ""
        }`}
      >
        {products.map((product) => {
          const msg = buildLeadMessage(journeyName, answers, [product.name]);
          const btns = productCtaButtons(product);

          return (
            <div
              key={product.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4"
            >
              {product.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.photo_url}
                  alt={product.name}
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}

              <h3 className="text-lg font-bold">{product.name}</h3>
              {product.benefits && (
                <p className="text-sm text-gray-600">{product.benefits}</p>
              )}

              <div className="mt-auto flex flex-col gap-2">
                {/* Botão de especificações (só quando o produto tem specs). */}
                {hasSpecs(product) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpecsProduct(product);
                      onSpecs(product.id);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      list_alt
                    </span>
                    Especificações
                  </button>
                )}

                {btns.map((btn, i) => (
                  <a
                    key={i}
                    href={ctaButtonHref(btn, msg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      btn.kind === "whatsapp"
                        ? onWhatsapp(product.id)
                        : onBuy(product.id)
                    }
                    className={
                      btn.kind === "whatsapp"
                        ? "rounded-lg bg-green-600 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-green-700"
                        : "rounded-lg border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    }
                  >
                    {btn.label || (btn.kind === "whatsapp" ? "Falar no WhatsApp" : "Saiba mais")}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA geral configurável (WhatsApp ou link personalizado). */}
      {cta && cta.value && (
        <a
          href={ctaButtonHref(cta, ctaMsg)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => (cta.kind === "whatsapp" ? onWhatsapp() : onBuy(""))}
          className={
            cta.kind === "whatsapp"
              ? "rounded-lg bg-green-700 px-6 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-green-800"
              : "rounded-lg border border-gray-300 px-6 py-4 text-center text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          }
        >
          {cta.label || (cta.kind === "whatsapp" ? "Falar no WhatsApp" : "Saiba mais")}
        </a>
      )}

      {/* Modal de especificações (resumo no topo + tabela abaixo). */}
      {specsProduct && (
        <SpecsModal
          product={specsProduct}
          specs={productSpecs.filter((s) => s.product_id === specsProduct.id)}
          onClose={() => setSpecsProduct(null)}
        />
      )}
    </main>
  );
}
