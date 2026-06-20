"use client";

import { useState } from "react";
import type { ProductAction, ProductVideoButton } from "@/lib/supabase";
import { buildWaLink } from "@/lib/wa";
import OptionIcon from "@/components/ui/OptionIcon";
import ActionFormModal from "./ActionFormModal";

// =====================================================================
// VideoActionButtons — botões de AÇÃO sobre o vídeo do player de produto.
// Cada botão aparece SÓ enquanto o tempo do vídeo está dentro do seu
// intervalo (start..end), surgindo com uma animação "ploc". O clique
// resolve por tipo (link, WhatsApp, produto ou formulário → registra lead).
// =====================================================================

type Props = {
  actions: ProductAction[];
  placements: ProductVideoButton[];
  current: number; // tempo atual do vídeo (segundos)
  productId: string;
  productName: string;
};

export default function VideoActionButtons({
  actions,
  placements,
  current,
  productId,
  productName,
}: Props) {
  // Sessão estável desta visita (liga o lead do formulário a esta sessão).
  const [sessionId] = useState(() => crypto.randomUUID());

  // Formulário aberto (botão tipo "form").
  const [formAction, setFormAction] = useState<ProductAction | null>(null);

  // Mapa rápido id → ação. Mantém o índice original para a key estável.
  const byId = new Map(actions.map((a) => [a.id, a]));
  const visible = placements
    .map((pl, i) => ({ pl, i, action: byId.get(pl.actionId) }))
    .filter(
      (x): x is { pl: ProductVideoButton; i: number; action: ProductAction } =>
        Boolean(x.action) && current >= x.pl.start && current <= x.pl.end
    );

  if (visible.length === 0 && !formAction) return null;

  return (
    <>
      {/* Coluna de botões na base, acima da área segura. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-2 px-4">
        {visible.map(({ pl, i, action }) => (
          <ActionButton
            key={`${pl.actionId}-${i}`}
            action={action}
            productName={productName}
            onOpenForm={() => setFormAction(action)}
          />
        ))}
      </div>

      {formAction && (
        <ActionFormModal
          action={formAction}
          productId={productId}
          sessionId={sessionId}
          onClose={() => setFormAction(null)}
        />
      )}
    </>
  );
}

function ActionButton({
  action,
  productName,
  onOpenForm,
}: {
  action: ProductAction;
  productName: string;
  onOpenForm: () => void;
}) {
  function handleClick() {
    if (action.kind === "custom" && action.url) {
      window.open(action.url, "_blank", "noopener,noreferrer");
    } else if (action.kind === "whatsapp" && action.whatsapp) {
      const msg = `Olá! Tenho interesse no produto "${productName}".`;
      window.open(buildWaLink(action.whatsapp, msg), "_blank", "noopener,noreferrer");
    } else if (action.kind === "product" && action.productId) {
      window.location.href = `/p/${action.productId}`;
    } else if (action.kind === "form") {
      onOpenForm();
    }
  }

  const opacity = action.opacity ?? 1;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ploc-in pointer-events-auto relative flex w-full max-w-sm items-center justify-center overflow-hidden rounded-full px-5 py-3 text-white shadow-lg"
    >
      {/* Camada de cor com opacidade configurável (fundo). */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: action.color, opacity }}
      />
      <span className="relative z-10 flex items-center gap-3">
        {action.icon && (
          <OptionIcon
            value={action.icon}
            size={24}
            className="shrink-0 text-2xl leading-none"
          />
        )}
        <span className="min-w-0 text-left">
          <span className="block truncate font-bold leading-tight">{action.label}</span>
          {action.subtitle && (
            <span className="block truncate text-sm leading-tight opacity-90">
              {action.subtitle}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
