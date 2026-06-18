"use client";

import type { Step, Product } from "@/lib/supabase";
import { buildLeadMessage, buildWaLink } from "@/lib/wa";
import StoryVideo from "./StoryVideo";

// =====================================================================
// ResultStep — tela final: vídeo de recomendação + produtos sugeridos
// com CTAs (Comprar e WhatsApp). É aqui que a conversão acontece.
// =====================================================================

type Props = {
  step: Step;
  products: Product[];
  journeyName: string;
  answers: Record<string, string>;
  onWhatsapp: (productId?: string) => void;
  onBuy: (productId: string) => void;
  onClose?: () => void;
};

export default function ResultStep({
  step,
  products,
  journeyName,
  answers,
  onWhatsapp,
  onBuy,
  onClose,
}: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      {/* Vídeo final de recomendação (formato stories com controles próprios) */}
      {step.video_url && <StoryVideo src={step.video_url} onClose={onClose} />}

      <h2 className="text-center text-2xl font-bold">
        {step.question_text || "Essas são as melhores opções para você."}
      </h2>

      {/* Cartões de produto */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {products.map((product) => {
          // Mensagem de WhatsApp já com o resumo do lead + este produto.
          const msg = buildLeadMessage(journeyName, answers, [product.name]);
          const waLink = product.whatsapp
            ? buildWaLink(product.whatsapp, msg)
            : null;

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
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsapp(product.id)}
                    className="rounded-lg bg-green-600 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    Falar no WhatsApp
                  </a>
                )}
                {product.buy_link && (
                  <a
                    href={product.buy_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onBuy(product.id)}
                    className="rounded-lg border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Ver produto
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA geral: falar com consultor (usa o WhatsApp do 1º produto) */}
      {products[0]?.whatsapp && (
        <a
          href={buildWaLink(
            products[0].whatsapp,
            buildLeadMessage(
              journeyName,
              answers,
              products.map((p) => p.name)
            )
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsapp()}
          className="rounded-lg bg-green-700 px-6 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-green-800"
        >
          Chamar consultor no WhatsApp
        </a>
      )}
    </main>
  );
}
