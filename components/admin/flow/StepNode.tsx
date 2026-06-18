"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Step, Option, StepField } from "@/lib/supabase";
import { useStepActions } from "./StepActionsContext";

// Dados que cada bloco carrega no canvas.
export type StepNodeData = {
  step: Step;
  options: Option[];
  // Campos do formulário (só em etapas de "coleta de dados").
  fields: StepField[];
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
  const { step, options, fields, isStart, productCount } = d;
  const isResult = step.type === "result";
  const isCollect = step.type === "collect";
  const actions = useStepActions();

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={`rounded-xl border bg-[var(--bg)] shadow-sm transition-shadow ${
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
              isResult || isCollect ? "ds-badge-accent" : "ds-badge-neutral"
            }`}
          >
            {isResult ? "Resultado" : isCollect ? "Coleta" : "Pergunta"}
          </span>
          {isStart && <span className="ds-badge ds-badge-success">Início</span>}
        </div>
        <div className="flex items-center gap-1">
          {/* Ações rápidas do card (não disparam seleção/arraste do nó). */}
          <button
            type="button"
            className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
            onClick={(e) => {
              e.stopPropagation();
              actions.onDuplicate(step.id);
            }}
            aria-label="Duplicar etapa"
            title="Duplicar etapa"
          >
            <IconDuplicate />
          </button>
          <button
            type="button"
            className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
            onClick={(e) => {
              e.stopPropagation();
              actions.onPreview(step.id);
            }}
            aria-label="Pré-visualizar etapa"
            title="Pré-visualizar etapa"
          >
            <IconEye />
          </button>
          {step.video_url ? (
            <span title="Tem vídeo" className="text-xs">🎬</span>
          ) : (
            <span title="Sem vídeo" className="text-xs opacity-40">🎬</span>
          )}
        </div>
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
      {!isResult && !isCollect && (
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

      {/* Coleta de dados — lista os campos e tem UM conector de saída único */}
      {isCollect && (
        <div className="relative flex flex-col border-t border-[var(--border)]">
          {fields.length === 0 ? (
            <span className="px-3 py-2 text-xs italic text-[var(--text-subtle)]">
              Sem campos ainda
            </span>
          ) : (
            fields.map((f) => (
              <div
                key={f.id}
                className="border-b border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] last:border-b-0"
              >
                {f.label}
                {f.required && <span className="text-[var(--danger)]"> *</span>}
              </div>
            ))
          )}
          {/* Conector de saída da etapa de coleta (avança para a próxima) */}
          <Handle
            id={`next-${step.id}`}
            type="source"
            position={Position.Right}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[var(--accent)]"
          />
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

// ----- Ícones do cabeçalho (SVG inline) -----

function IconDuplicate() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
