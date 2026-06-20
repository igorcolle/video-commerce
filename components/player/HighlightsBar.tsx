"use client";

import { useRef } from "react";
import type { ProductVideoButton } from "@/lib/supabase";

// =====================================================================
// HighlightsBar — bolinhas de DESTAQUE no topo da tela (estilo Instagram).
// Cada bolinha mostra uma PRÉVIA ANIMADA (vídeo leve, mudo, em loop) do
// destaque, com a foto do produto como fallback/poster, e o nome embaixo.
// Componente apresentacional: ao tocar numa bolinha, apenas avisa o pai
// via onOpen (quem controla a abertura é o ProductPlayer/HighlightViewer).
//
// A faixa preta translúcida (efeito vidro/liquid glass) atrás das bolinhas
// dá contraste sobre o vídeo. Ela NÃO ocupa a largura toda: cresce conforme
// o número de destaques (2/3/4...) e, com mais do que cabe, vira rolagem
// horizontal com setas. Quando "collapsible", mostra um botão minimizar
// que fica metade sobre a faixa, metade fora.
// =====================================================================

export type HighlightItem = {
  id: string;
  productId: string;
  title: string | null;
  videoUrl: string;
  photo: string | null;
  // Botões de ação posicionados NESTE destaque (timing por vídeo).
  buttons: ProductVideoButton[];
};

type Props = {
  items: HighlightItem[];
  // Avisa o player que um destaque foi tocado (abre o viewer / troca de destaque).
  onOpen: (item: HighlightItem) => void;
  // Habilita o botão de minimizar/maximizar (usado no overlay do player principal).
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  // Destaque atualmente em foco (para marcar a bolinha ativa no viewer).
  activeId?: string;
};

export default function HighlightsBar({
  items,
  onOpen,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  activeId,
}: Props) {
  // Container rolável (usado pelas setas quando há mais de 4 destaques).
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  // Setas só aparecem quando há mais destaques do que cabem na referência (4).
  const showArrows = items.length > 4;
  // Com 4 destaques a faixa preenche a largura (margens simétricas); 2/3 ficam
  // curtos à esquerda; 5+ rola.
  const fill = items.length >= 4;
  // Distribuição interna: 4 → espaçado (justify-between); demais → gap fixo.
  // Com >4 rola horizontalmente, mas SEM barra visível (no-scrollbar).
  const scrollerClass = showArrows
    ? "flex gap-5 overflow-x-auto no-scrollbar"
    : items.length === 4
      ? "flex justify-between"
      : "flex gap-5";

  function scrollBy(dir: number) {
    scrollerRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  }

  // Minimizado: mostra só um botão discreto para reabrir os destaques.
  if (collapsible && collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur-xl transition-colors hover:bg-black/70"
        title="Mostrar destaques"
      >
        <span>Destaques</span>
        <ChevronDown />
      </button>
    );
  }

  return (
    // w-fit (curto) ou w-full (preenche, com 4+). max-w-full + relative: cabe
    // na tela e ancora o botão minimizar.
    <div
      className={`relative ${
        fill ? "w-full" : "w-fit"
      } max-w-full rounded-2xl bg-black/55 px-3 py-2 ring-1 ring-white/10 backdrop-blur-xl`}
    >
      <div ref={scrollerRef} className={scrollerClass}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1"
          >
              <span
                className={`rounded-full p-[2px] ${
                  activeId === item.id
                    ? "bg-white"
                    : "bg-gradient-to-tr from-green-500 to-emerald-400"
                }`}
              >
                <span className="block h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-gray-900">
                  {/* Prévia animada e leve do vídeo do destaque (foto como poster). */}
                  <video
                    src={item.videoUrl}
                    poster={item.photo ?? undefined}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </span>
              </span>
              <span className="w-full truncate text-center text-xs font-semibold uppercase text-white">
                {item.title || "Destaque"}
              </span>
            </button>
          ))}
      </div>

      {/* Setas sobrepostas aos vídeos (não ocupam espaço; só com rolagem).
          Ficam por cima das bolinhas, na altura do centro dos círculos. */}
      {showArrows && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="absolute left-1 top-10 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Próximo"
            className="absolute right-1 top-10 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <ChevronRight />
          </button>
        </>
      )}

      {/* Botão minimizar (chevron) — metade sobre a faixa, metade fora. */}
      {collapsible && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Minimizar destaques"
          title="Minimizar destaques"
          className="absolute -bottom-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur-xl transition-colors hover:bg-black/85"
        >
          <ChevronUp />
        </button>
      )}
    </div>
  );
}

function ChevronUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
