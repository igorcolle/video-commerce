"use client";

import type { ProductButton } from "@/lib/supabase";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

// =====================================================================
// ButtonsEditor — editor controlado de botões de ação (WhatsApp / link
// personalizado). Reutilizado nos produtos (até 2) e no CTA geral do
// resultado (1). Não salva sozinho: avisa o pai por onChange.
// =====================================================================
type Props = {
  value: ProductButton[];
  onChange: (next: ProductButton[]) => void;
  max: number;
  // Texto do botão de adicionar (varia por contexto).
  addLabel?: string;
};

const DEFAULT_LABEL: Record<ProductButton["kind"], string> = {
  whatsapp: "Falar no WhatsApp",
  custom: "Saiba mais",
};

export default function ButtonsEditor({
  value,
  onChange,
  max,
  addLabel = "+ Adicionar botão",
}: Props) {
  function update(index: number, patch: Partial<ProductButton>) {
    onChange(value.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function changeKind(index: number, kind: ProductButton["kind"]) {
    // Ao trocar o tipo, ajusta o rótulo padrão se ainda estiver no default antigo.
    const cur = value[index];
    const label =
      !cur.label || cur.label === DEFAULT_LABEL[cur.kind]
        ? DEFAULT_LABEL[kind]
        : cur.label;
    update(index, { kind, label });
  }

  function add() {
    if (value.length >= max) return;
    onChange([...value, { kind: "whatsapp", label: DEFAULT_LABEL.whatsapp, value: "" }]);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((b, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2.5"
        >
          <div className="flex items-center gap-2">
            <Select
              value={b.kind}
              onChange={(e) =>
                changeKind(i, e.target.value as ProductButton["kind"])
              }
              className="flex-1"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="custom">Personalizado</option>
            </Select>
            <button
              type="button"
              aria-label="Remover botão"
              onClick={() => remove(i)}
              className="px-1.5 text-[var(--danger)] hover:opacity-70"
            >
              ✕
            </button>
          </div>

          <Field label="Texto do botão">
            <Input
              value={b.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder={DEFAULT_LABEL[b.kind]}
            />
          </Field>

          <Field
            label={
              b.kind === "whatsapp" ? "Número (com DDI, ex.: 5562999999999)" : "Link"
            }
          >
            <Input
              value={b.value}
              onChange={(e) => update(i, { value: e.target.value })}
              inputMode={b.kind === "whatsapp" ? "numeric" : undefined}
              placeholder={
                b.kind === "whatsapp" ? "5562999999999" : "https://..."
              }
            />
          </Field>
        </div>
      ))}

      {value.length < max && (
        <Button type="button" variant="secondary" size="sm" onClick={add} className="w-fit">
          {addLabel}
        </Button>
      )}
    </div>
  );
}
