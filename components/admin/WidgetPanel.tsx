"use client";

// =====================================================================
// WidgetPanel — configuração do WIDGET (a "bolha" de vídeo que o cliente
// cola no site dele). É uma configuração da JORNADA inteira, por isso fica
// no cabeçalho da jornada (ao lado de "Ver player"), e não dentro de uma
// etapa. Abre um modal com: formato, borda (com cor), posição, tamanho,
// preview e o código de embed. Tem também um "preview real" que mostra a
// bolha flutuando no canto da tela, exatamente como aparece no site.
// =====================================================================

import { useState } from "react";
import type { WidgetFormat, WidgetPosition } from "@/lib/supabase";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { updateJourneyWidgetQuiet } from "@/app/admin/jornadas/[id]/flow-actions";

const WIDGET_FORMATS: { id: WidgetFormat; name: string }[] = [
  { id: "rectangle", name: "Retangular" },
  { id: "square", name: "Quadrado" },
  { id: "circle", name: "Arredondado (círculo)" },
];

const WIDGET_POSITIONS: { id: WidgetPosition; name: string }[] = [
  { id: "right", name: "Canto inferior direito" },
  { id: "left", name: "Canto inferior esquerdo" },
];

// Dimensões base da bolha conforme o formato (espelha public/widget.js).
function baseBubbleSize(format: WidgetFormat): {
  w: number;
  h: number;
  radius: string;
} {
  if (format === "circle") return { w: 76, h: 76, radius: "9999px" };
  if (format === "square") return { w: 76, h: 76, radius: "16px" };
  return { w: 116, h: 76, radius: "16px" }; // rectangle
}

type Props = {
  journeyId: string;
  slug: string | null;
  startVideoUrl: string;
  initial: {
    format: WidgetFormat;
    border: boolean;
    borderColor: string;
    position: WidgetPosition;
    size: number;
  };
};

export default function WidgetPanel({
  journeyId,
  slug,
  startVideoUrl,
  initial,
}: Props) {
  const [open, setOpen] = useState(false); // modal de configuração
  const [showPreview, setShowPreview] = useState(false); // bolha "de verdade"
  const [copied, setCopied] = useState(false);
  // Origem do site (para montar o código de embed).
  const [siteOrigin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  );

  // Estado do widget (salvo no banco a cada mudança).
  const [format, setFormat] = useState<WidgetFormat>(initial.format);
  const [border, setBorder] = useState(initial.border);
  const [borderColor, setBorderColor] = useState(initial.borderColor);
  const [position, setPosition] = useState<WidgetPosition>(initial.position);
  const [size, setSize] = useState(initial.size);

  // Salva uma mudança no banco sem travar a interface.
  function save(patch: {
    widget_format?: WidgetFormat;
    widget_border?: boolean;
    widget_border_color?: string;
    widget_position?: WidgetPosition;
    widget_size?: number;
  }) {
    updateJourneyWidgetQuiet(journeyId, patch).catch(() => {});
  }

  const origin = siteOrigin || "https://SEU-SITE";
  const embedCode = slug
    ? `<script src="${origin}/widget.js"\n  data-journey="${slug}"\n  data-format="${format}"\n  data-border="${border}"\n  data-border-color="${borderColor}"\n  data-position="${position}"\n  data-size="${size}"\n  data-video="${startVideoUrl}"\n  async></script>`
    : "";

  async function copy() {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* navegador bloqueou a área de transferência */
    }
  }

  // Dimensões da bolha já com o tamanho (%) aplicado.
  const base = baseBubbleSize(format);
  const scale = size / 100;
  const bubbleW = Math.round(base.w * scale);
  const bubbleH = Math.round(base.h * scale);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses("secondary", "sm")}
      >
        Widget
      </button>

      {/* ---------- Modal de configuração ---------- */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="ds-card w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Widget da jornada</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs text-[var(--text-subtle)]">
                O widget é a “bolha” de vídeo que aparece num canto do site do seu
                cliente. Ao clicar, ela abre esta jornada. As opções abaixo valem
                para a jornada inteira.
              </p>

              <Field label="Formato">
                <Select
                  value={format}
                  onChange={(e) => {
                    const v = e.target.value as WidgetFormat;
                    setFormat(v);
                    save({ widget_format: v });
                  }}
                >
                  {WIDGET_FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={border}
                  onChange={(e) => {
                    setBorder(e.target.checked);
                    save({ widget_border: e.target.checked });
                  }}
                />
                Com borda
              </label>

              {border && (
                <div>
                  <span className="ds-label mb-1.5 block">Cor da borda</span>
                  <ColorPicker
                    value={borderColor}
                    onChange={(hex) => {
                      setBorderColor(hex);
                      save({ widget_border_color: hex });
                    }}
                  />
                </div>
              )}

              <Field label="Posição na tela">
                <Select
                  value={position}
                  onChange={(e) => {
                    const v = e.target.value as WidgetPosition;
                    setPosition(v);
                    save({ widget_position: v });
                  }}
                >
                  {WIDGET_POSITIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Tamanho (%) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="ds-label">Tamanho</span>
                  <span className="text-xs text-[var(--text-muted)]">{size}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  onMouseUp={() => save({ widget_size: size })}
                  onTouchEnd={() => save({ widget_size: size })}
                  className="w-full"
                />
              </div>

              {/* Mini pré-visualização da bolha */}
              <div>
                <span className="ds-label mb-1.5 block">Pré-visualização</span>
                <div
                  className={`flex ${
                    position === "left" ? "justify-start" : "justify-end"
                  } items-center rounded-lg bg-gradient-to-b from-gray-200 to-gray-400 p-4`}
                  style={{ minHeight: 110 }}
                >
                  <div
                    className="flex items-center justify-center overflow-hidden bg-black shadow-lg"
                    style={{
                      width: bubbleW,
                      height: bubbleH,
                      borderRadius: base.radius,
                      border: border ? `3px solid ${borderColor}` : "none",
                    }}
                  >
                    {startVideoUrl ? (
                      <video
                        src={startVideoUrl}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-white">▶</span>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    Pré-visualizar no site
                  </Button>
                </div>
              </div>

              {/* Instruções + código de embed */}
              <div className="border-t border-[var(--border)] pt-4">
                <span className="ds-label mb-1.5 block">
                  Código para colar no site
                </span>
                {slug ? (
                  <>
                    <p className="mb-2 text-xs text-[var(--text-subtle)]">
                      Copie o código abaixo e cole no HTML do site, de preferência
                      antes de <code>&lt;/body&gt;</code>. A jornada precisa estar{" "}
                      <strong>publicada</strong>. Se trocar o vídeo da etapa
                      inicial, copie o código de novo.
                    </p>
                    <Textarea
                      readOnly
                      rows={8}
                      value={embedCode}
                      onFocus={(e) => e.currentTarget.select()}
                      className="font-mono text-[11px]"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={copy}>
                        Copiar código
                      </Button>
                      {copied && (
                        <span className="text-xs text-[var(--success-fg)]">
                          ✓ Copiado!
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[var(--text-subtle)]">
                    Defina um endereço (slug) nas “Configurações da jornada” para
                    gerar o código do widget.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Preview "real": a bolha flutuando no canto ---------- */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[1100]"
          style={{ pointerEvents: "none" }}
        >
          <div
            className="absolute bottom-5"
            style={{
              [position === "left" ? "left" : "right"]: 20,
              pointerEvents: "auto",
            }}
          >
            <div className="relative">
              {/* Bolha (exatamente como o widget.js desenha) */}
              <div
                className="flex items-center justify-center overflow-hidden bg-black"
                style={{
                  width: bubbleW,
                  height: bubbleH,
                  borderRadius: base.radius,
                  border: border ? `3px solid ${borderColor}` : "none",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
                }}
              >
                {startVideoUrl ? (
                  <video
                    src={startVideoUrl}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-white">▶</span>
                )}
                {/* Selinho de play central */}
                <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-sm text-white">
                  ▶
                </span>
              </div>

              {/* Botão de fechar o widget */}
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Fechar widget"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow-md ring-1 ring-black/10 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
