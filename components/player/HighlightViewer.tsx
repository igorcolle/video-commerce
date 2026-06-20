"use client";

import StoryVideo from "./StoryVideo";
import HighlightsBar, { type HighlightItem } from "./HighlightsBar";

// =====================================================================
// HighlightViewer — abre um DESTAQUE (story) em tela cheia, reaproveitando
// o StoryVideo (player vertical com controles próprios). No topo mostra
// TODOS os destaques (barra maximizada), permitindo trocar entre eles.
// =====================================================================

type Props = {
  items: HighlightItem[];
  current: HighlightItem;
  onSelect: (item: HighlightItem) => void;
  onClose: () => void;
};

export default function HighlightViewer({
  items,
  current,
  onSelect,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2"
      onClick={onClose}
    >
      <div
        className="relative h-[100dvh] w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tr: vídeo do destaque atual (key troca o vídeo ao selecionar outro). */}
        <StoryVideo key={current.id} src={current.videoUrl} onClose={onClose} fitToHeight>
          {/* Todos os destaques no topo, já maximizados; tocar troca o vídeo. */}
          <div className="absolute left-2 right-14 top-3 z-20">
            <HighlightsBar items={items} onOpen={onSelect} activeId={current.id} />
          </div>

          {current.title && (
            <div className="pointer-events-none absolute left-1/2 top-[5.5rem] z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold uppercase text-white backdrop-blur-sm">
              {current.title}
            </div>
          )}
        </StoryVideo>
      </div>
    </div>
  );
}
