"use client";

import { useState } from "react";
import type { Option, StepField, FieldKind } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { EmojiPicker } from "@/components/ui/EmojiPicker";

// Subcomponentes do Inspector: linha de campo (coleta) e linha de botão
// (pergunta). Extraídos para o Inspector ficar mais enxuto.

// Tipos de campo disponíveis na etapa de coleta de dados.
const FIELD_KINDS: { id: FieldKind; name: string }[] = [
  { id: "full_name", name: "Nome completo" },
  { id: "email", name: "E-mail" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "custom", name: "Personalizado" },
];

// Linha de edição de um campo do formulário de coleta.
// O rótulo salva ao sair do campo; tipo/obrigatório salvam na hora.
export function FieldRow({
  field,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onReorder,
}: {
  field: StepField;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: {
    kind?: FieldKind;
    label?: string;
    required?: boolean;
  }) => void;
  onDelete: () => void;
  onReorder: (direction: "up" | "down") => void;
}) {
  const [label, setLabel] = useState(field.label);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2.5">
      <div className="flex items-center gap-1">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Mover para cima"
            disabled={isFirst}
            onClick={() => onReorder("up")}
            className="px-1 text-xs leading-none text-[var(--text-subtle)] hover:text-[var(--text)] disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Mover para baixo"
            disabled={isLast}
            onClick={() => onReorder("down")}
            className="px-1 text-xs leading-none text-[var(--text-subtle)] hover:text-[var(--text)] disabled:opacity-30"
          >
            ▼
          </button>
        </div>

        <Select
          value={field.kind}
          onChange={(e) => onUpdate({ kind: e.target.value as FieldKind })}
          className="flex-1"
        >
          {FIELD_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </Select>

        <button
          type="button"
          aria-label="Excluir campo"
          onClick={onDelete}
          className="px-1.5 text-[var(--danger)] hover:opacity-70"
        >
          ✕
        </button>
      </div>

      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => onUpdate({ label })}
        placeholder={
          field.kind === "custom" ? "Pergunta ao visitante" : "Rótulo do campo"
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        Obrigatório
      </label>
    </div>
  );
}

// Linha de edição de um botão: ícone + texto em destaque + texto secundário.
// Textos salvam ao sair do campo; o ícone salva ao escolher.
export function OptionRow({
  option,
  journeyId,
  onFields,
  onDelete,
  onReplicateStyle,
}: {
  option: Option;
  journeyId: string;
  onFields: (fields: {
    label?: string;
    subtitle?: string | null;
    icon?: string | null;
  }) => void;
  onDelete: () => void;
  onReplicateStyle: () => void;
}) {
  const [label, setLabel] = useState(option.label);
  const [subtitle, setSubtitle] = useState(option.subtitle ?? "");
  const [replicated, setReplicated] = useState(false);

  function handleReplicate() {
    if (
      !confirm(
        "Aplicar o visual desta etapa (cores, fonte, template, etc.) a todas as outras etapas de pergunta da jornada?"
      )
    )
      return;
    onReplicateStyle();
    setReplicated(true);
    setTimeout(() => setReplicated(false), 2500);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Botão
        </span>
        <Button variant="danger" size="sm" onClick={onDelete}>
          ✕
        </Button>
      </div>

      <Field label="Texto em destaque">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onFields({ label })}
        />
      </Field>

      <Field label="Texto secundário">
        <Input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onBlur={() => onFields({ subtitle: subtitle || null })}
          placeholder="Opcional"
        />
      </Field>

      <div>
        <span className="ds-label mb-1.5 block">Ícone</span>
        <EmojiPicker
          value={option.icon}
          onChange={(icon) => onFields({ icon })}
          journeyId={journeyId}
          optionId={option.id}
        />
      </div>

      {/* Replicar o estilo da etapa para as demais etapas da jornada. */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleReplicate}>
          Replicar estilo
        </Button>
        {replicated && (
          <span className="text-xs text-[var(--success-fg)]">
            ✓ Aplicado às demais etapas
          </span>
        )}
      </div>
    </div>
  );
}
