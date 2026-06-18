"use client";

import { useState } from "react";
import type { Step, StepField } from "@/lib/supabase";
import { maskWhatsapp, isValidEmail, isValidWhatsapp } from "@/lib/mask";
import StoryVideo from "./StoryVideo";

// =====================================================================
// CollectStep — etapa de "coleta de dados". Igual à etapa de pergunta
// (vídeo stories + overlay), mas em vez de botões de decisão mostra um
// FORMULÁRIO com os campos configurados no admin. Valida antes de enviar
// (e-mail com "@"; WhatsApp com 10 ou 11 dígitos) e avança para a próxima
// etapa (step.next_step_id).
// =====================================================================

type Props = {
  step: Step;
  fields: StepField[];
  onSubmit: (values: Record<string, string>) => void;
  onClose?: () => void;
  onBack?: () => void;
  onReady?: () => void;
  audioOn?: boolean;
  onAudioChange?: (on: boolean) => void;
};

// Tipo de <input> conforme o campo.
function inputType(kind: StepField["kind"]): string {
  if (kind === "email") return "email";
  if (kind === "whatsapp") return "tel";
  return "text";
}

export default function CollectStep({
  step,
  fields,
  onSubmit,
  onClose,
  onBack,
  onReady,
  audioOn,
  onAudioChange,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue(field: StepField, raw: string) {
    const v = field.kind === "whatsapp" ? maskWhatsapp(raw) : raw;
    setValues((prev) => ({ ...prev, [field.id]: v }));
  }

  // Valida e, se ok, devolve os valores ao Player.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.id] ?? "").trim();
      if (f.required && !v) {
        next[f.id] = "Campo obrigatório.";
        continue;
      }
      if (v && f.kind === "email" && !isValidEmail(v)) {
        next[f.id] = "E-mail inválido.";
        continue;
      }
      if (v && f.kind === "whatsapp" && !isValidWhatsapp(v)) {
        next[f.id] = "WhatsApp inválido (DDD + número).";
        continue;
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(values);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-4 sm:p-8">
      <StoryVideo
        src={step.video_url ?? ""}
        onClose={onClose}
        onReady={onReady}
        audioOn={audioOn}
        onAudioChange={onAudioChange}
      >
        {() => (
          <>
            {/* Gradiente para legibilidade */}
            <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

            {/* Botão minimalista de voltar (centro-esquerda) */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar ao vídeo anterior"
                className="pointer-events-auto absolute left-3 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {/* Formulário */}
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-4">
              <form
                onSubmit={handleSubmit}
                className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-sm"
              >
                {step.question_text && (
                  <h2 className="mb-1 text-center text-base font-bold text-gray-900">
                    {step.question_text}
                  </h2>
                )}

                {fields.map((f) => (
                  <label key={f.id} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {f.label}
                      {f.required && <span className="text-red-500"> *</span>}
                    </span>
                    <input
                      type={inputType(f.kind)}
                      inputMode={f.kind === "whatsapp" ? "numeric" : undefined}
                      value={values[f.id] ?? ""}
                      onChange={(e) => setValue(f, e.target.value)}
                      placeholder={
                        f.kind === "whatsapp" ? "(11) 99999-9999" : undefined
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[var(--primary,#1a1d21)] focus:ring-2 focus:ring-black/10"
                    />
                    {errors[f.id] && (
                      <span className="text-xs font-medium text-red-600">
                        {errors[f.id]}
                      </span>
                    )}
                  </label>
                ))}

                <button
                  type="submit"
                  className="mt-1 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
                >
                  Continuar
                </button>
              </form>
            </div>
          </>
        )}
      </StoryVideo>
    </main>
  );
}
