"use client";

// =====================================================================
// HighlightsBar — bolinhas de DESTAQUE no topo da tela (estilo Instagram).
// Cada bolinha mostra uma PRÉVIA ANIMADA (vídeo leve, mudo, em loop) do
// destaque, com a foto do produto como fallback/poster, e o nome embaixo.
// Componente apresentacional: ao tocar numa bolinha, apenas avisa o pai
// via onOpen (quem controla a abertura é o ProductPlayer/HighlightViewer).
//
// A faixa preta translúcida (efeito vidro) atrás das bolinhas dá contraste
// sobre o vídeo. Quando "collapsible", mostra um botão minimizar/maximizar.
// =====================================================================

export type HighlightItem = {
  id: string;
  productId: string;
  title: string | null;
  videoUrl: string;
  photo: string | null;
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
  if (items.length === 0) return null;

  // Minimizado: mostra só um botão discreto para reabrir os destaques.
  if (collapsible && collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/55"
        title="Mostrar destaques"
      >
        <span>Destaques</span>
        <ChevronDown />
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-black/40 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="scrollbar-thin flex flex-1 gap-4 overflow-x-auto pb-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <span
                className={`rounded-full p-[2px] ${
                  activeId === item.id
                    ? "bg-white"
                    : "bg-gradient-to-tr from-green-500 to-emerald-400"
                }`}
              >
                <span className="block h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-gray-900">
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

        {/* Botão minimizar (chevron para cima) — só no overlay do player. */}
        {collapsible && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Minimizar destaques"
            title="Minimizar destaques"
            className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronUp />
          </button>
        )}
      </div>
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
