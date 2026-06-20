"use client";

import { useState } from "react";
import type { ProductAction, ProductFormField } from "@/lib/supabase";
import { maskWhatsapp, isValidEmail, isValidWhatsapp } from "@/lib/mask";

// =====================================================================
// ActionFormModal — formulário de um botão de ação do tipo "formulário".
// Ao enviar, registra um LEAD no sistema (POST /api/leads) vinculado ao
// produto (sem jornada). Valida e-mail e WhatsApp antes de enviar.
// =====================================================================

type Props = {
  action: ProductAction;
  productId: string;
  sessionId: string;
  onClose: () => void;
};

function inputType(kind: ProductFormField["kind"]): string {
  if (kind === "email") return "email";
  if (kind === "whatsapp") return "tel";
  return "text";
}

export default function ActionFormModal({
  action,
  productId,
  sessionId,
  onClose,
}: Props) {
  const fields = action.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Chave estável por campo (índice) — os campos não têm id próprio.
  function keyOf(i: number) {
    return `f${i}`;
  }

  function setValue(i: number, f: ProductFormField, raw: string) {
    const v = f.kind === "whatsapp" ? maskWhatsapp(raw) : raw;
    setValues((prev) => ({ ...prev, [keyOf(i)]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    fields.forEach((f, i) => {
      const v = (values[keyOf(i)] ?? "").trim();
      if (f.required && !v) {
        next[keyOf(i)] = "Campo obrigatório.";
        return;
      }
      if (v && f.kind === "email" && !isValidEmail(v))
        next[keyOf(i)] = "E-mail inválido.";
      if (v && f.kind === "whatsapp" && !isValidWhatsapp(v))
        next[keyOf(i)] = "WhatsApp inválido (DDD + número).";
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Monta o lead: campos conhecidos viram colunas; os demais vão em answers.
    let name: string | null = null;
    let email: string | null = null;
    let whatsapp: string | null = null;
    const answers: Record<string, string> = {};
    fields.forEach((f, i) => {
      const v = (values[keyOf(i)] ?? "").trim();
      if (!v) return;
      if (f.kind === "full_name") name = v;
      else if (f.kind === "email") email = v;
      else if (f.kind === "whatsapp") whatsapp = v;
      else answers[f.label || `Campo ${i + 1}`] = v;
    });

    setSending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          session_id: sessionId,
          name,
          email,
          whatsapp,
          answers,
        }),
      });
      if (!res.ok) throw new Error("falha");
      setDone(true);
    } catch {
      window.alert("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="material-symbols-outlined text-[40px] text-green-600">
              check_circle
            </span>
            <p className="text-base font-bold text-gray-900">Recebido! Obrigado.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 rounded-lg bg-gray-900 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-gray-900">
                {action.label || "Preencha seus dados"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {action.subtitle && (
              <p className="-mt-1 mb-1 text-sm text-gray-600">{action.subtitle}</p>
            )}

            {fields.map((f, i) => (
              <label key={i} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-700">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </span>
                <input
                  type={inputType(f.kind)}
                  inputMode={f.kind === "whatsapp" ? "numeric" : undefined}
                  value={values[keyOf(i)] ?? ""}
                  onChange={(e) => setValue(i, f, e.target.value)}
                  placeholder={f.kind === "whatsapp" ? "(11) 99999-9999" : undefined}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-black/10"
                />
                {errors[keyOf(i)] && (
                  <span className="text-xs font-medium text-red-600">
                    {errors[keyOf(i)]}
                  </span>
                )}
              </label>
            ))}

            <button
              type="submit"
              disabled={sending}
              className="mt-1 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
