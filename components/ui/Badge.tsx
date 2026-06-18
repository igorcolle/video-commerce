import type { ReactNode } from "react";

// Etiqueta arredondada (status, contagens). Tons do design system.
type Tone = "neutral" | "accent" | "success";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`ds-badge ds-badge-${tone}`}>{children}</span>;
}
