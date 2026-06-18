import type { HTMLAttributes } from "react";

// Cartão branco com borda fina e sombra suave (estilo Attio).
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ds-card ${className}`} {...props} />;
}
