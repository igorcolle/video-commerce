"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Step, Option } from "@/lib/supabase";

// Dados que cada bloco carrega no canvas.
export type StepNodeData = {
  step: Step;
  options: Option[];
  isStart: boolean;
  productCount: number;
  // IDs dos produtos vinculados (usado pelo Inspector em etapas de resultado).
  productIds: string[];
};

export const NODE_WIDTH = 250;

// Bloco (nó) de uma etapa no flow builder.
// - Etapa de pergunta: mostra cada opção com um conector (handle) à direita.
// - Etapa de resultado: mostra a contagem de produtos. Só recebe conexão.
export default function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as StepNodeData;
  const { step, options, isStart, productCount } = d;
  const isResult = step.type === "result";

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={`rounded-xl border bg-white shadow-sm transition-shadow ${
        selected
          ? "border-[var(--accent)] shadow-md ring-2 ring-[var(--accent-soft)]"
          : "border-[var(--border)]"
      }`}
    >
      {/* Conector de ENTRADA (esquerda) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[var(--text-subtle)]"
      />

      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`ds-badge ${
              isResult ? "ds-badge-accent" : "ds-badge-neutral"
            }`}
          >
            {isResult ? "Resultado" : "Pergunta"}
          </span>
          {isStart && <span className="ds-badge ds-badge-success">Início</span>}
        </div>
        {step.video_url ? (
          <span title="Tem vídeo" className="text-xs">🎬</span>
        ) : (
          <span title="Sem vídeo" className="text-xs opacity-40">🎬</span>
        )}
      </div>

      {/* Corpo */}
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold text-[var(--text)]">
          {step.title || "Sem título"}
        </p>
        {step.question_text && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
            {step.question_text}
          </p>
        )}
      </div>

      {/* Opções (só em pergunta) — cada uma tem um conector de saída */}
      {!isResult && (
        <div className="flex flex-col border-t border-[var(--border)]">
          {options.length === 0 && (
            <span className="px-3 py-2 text-xs italic text-[var(--text-subtle)]">
              Sem botões ainda
            </span>
          )}
          {options.map((opt) => (
            <div
              key={opt.id}
              className="relative flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5 text-xs last:border-b-0"
            >
              <span className="truncate text-[var(--text)]">
                {opt.icon ? `${opt.icon} ` : ""}
                {opt.label}
              </span>
              <Handle
                id={opt.id}
                type="source"
                position={Position.Right}
                className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[var(--accent)]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Resumo de produtos (só em resultado) */}
      {isResult && (
        <div className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
          {productCount > 0
            ? `${productCount} produto(s) neste resultado`
            : "Nenhum produto marcado"}
        </div>
      )}
    </div>
  );
}
