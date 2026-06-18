import type { ReactNode } from "react";

// Campo rotulado: rótulo em cima + o controle embaixo.
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ds-label">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--text-subtle)]">{hint}</span>}
    </label>
  );
}
