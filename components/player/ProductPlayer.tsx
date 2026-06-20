"use client";

import { useState } from "react";
import type { Product, ProductSpec, ProductVideo } from "@/lib/supabase";
import StoryVideo from "./StoryVideo";
import SpecsModal from "./SpecsModal";
import HighlightsBar, { type HighlightItem } from "./HighlightsBar";
import HighlightViewer from "./HighlightViewer";

// =====================================================================
// ProductPlayer — player público de UM produto (formato 9:16 / 1080x1920),
// com os mesmos botões laterais das jornadas. O botão de carrinho é
// substituído por um botão que abre as ESPECIFICAÇÕES do produto.
// As "bolinhas" de destaque (cada uma é um atributo/vídeo do produto)
// aparecem no topo, sobre o vídeo.
// =====================================================================

type Props = {
  product: Product;
  specs: ProductSpec[];
  videoUrl: string | null;
  // Vídeos de destaque do produto (stories) — viram as bolinhas no topo.
  highlights: ProductVideo[];
};

export default function ProductPlayer({
  product,
  specs,
  videoUrl,
  highlights,
}: Props) {
  const [specsOpen, setSpecsOpen] = useState(false);
  // Destaque aberto em tela cheia (null = nenhum).
  const [openHighlight, setOpenHighlight] = useState<HighlightItem | null>(null);
  // Barra de destaques minimizada pelo visitante (oculta as bolinhas).
  const [barCollapsed, setBarCollapsed] = useState(false);

  // Monta as bolinhas de destaque a partir dos vídeos do produto.
  const highlightItems: HighlightItem[] = highlights.map((v) => ({
    id: v.id,
    productId: product.id,
    title: v.title,
    videoUrl: v.video_url,
    photo: product.photo_url,
  }));

  // Quantos segundos antes do fim do vídeo principal a barra deve aparecer.
  // 0 (ou ausente) = aparece desde o início.
  const revealSecs = product.highlights_reveal_seconds || 0;

  // Só oferece especificações quando ativadas E há resumo ou linhas (mesma regra
  // do ResultStep). Evita abrir um painel vazio.
  const hasSpecs =
    product.specs_enabled && (Boolean(product.specs_summary) || specs.length > 0);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-black">
      {videoUrl ? (
        <StoryVideo
          src={videoUrl}
          fitToHeight
          onSpecsClick={hasSpecs ? () => setSpecsOpen(true) : undefined}
          specsActive={specsOpen}
        >
          {({ remaining }) => {
            // Bolinhas sobre o vídeo (acima da camada de pausa, abaixo dos
            // controles do canto superior direito). A barra aparece desde o
            // início (revealSecs = 0) ou só quando faltarem N segundos.
            const barVisible = revealSecs <= 0 || remaining <= revealSecs;
            if (highlightItems.length === 0 || !barVisible) return null;
            return (
              <div className="absolute left-2 right-14 top-3 z-20">
                <HighlightsBar
                  items={highlightItems}
                  onOpen={setOpenHighlight}
                  collapsible
                  collapsed={barCollapsed}
                  onToggleCollapsed={() => setBarCollapsed((v) => !v)}
                />
              </div>
            );
          }}
        </StoryVideo>
      ) : (
        // Sem vídeo: mostra a foto + nome + acesso às especificações.
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4 p-6 text-center">
          {highlightItems.length > 0 && (
            <HighlightsBar items={highlightItems} onOpen={setOpenHighlight} />
          )}
          {product.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.photo_url}
              alt={product.name}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white/5 text-white/30">
              <span className="material-symbols-outlined text-[64px]">image</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{product.name}</h1>
          {hasSpecs && (
            <button
              type="button"
              onClick={() => setSpecsOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[18px]">list_alt</span>
              Especificações
            </button>
          )}
        </div>
      )}

      {/* Destaque aberto em tela cheia, com todos os destaques no topo. */}
      {openHighlight && (
        <HighlightViewer
          items={highlightItems}
          current={openHighlight}
          onSelect={setOpenHighlight}
          onClose={() => setOpenHighlight(null)}
        />
      )}

      {specsOpen && (
        <SpecsModal
          product={product}
          specs={specs}
          onClose={() => setSpecsOpen(false)}
        />
      )}
    </main>
  );
}
