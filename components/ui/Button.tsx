import type { ButtonHTMLAttributes } from "react";

// Botão do design system (Attio). Variantes e tamanhos via classes .ds-*
// definidas em globals.css. Funciona tanto com onClick quanto com
// formAction (server actions).
type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "md" | "sm";

const variantClass: Record<Variant, string> = {
  primary: "ds-btn-primary",
  accent: "ds-btn-accent",
  secondary: "ds-btn-secondary",
  ghost: "ds-btn-ghost",
  danger: "ds-btn-danger",
};

// Helper para aplicar o mesmo visual em links (<a>/<Link>).
export function buttonClasses(variant: Variant = "primary", size: Size = "md") {
  return `ds-btn ${variantClass[variant]} ${size === "sm" ? "ds-btn-sm" : ""}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`${buttonClasses(variant, size)} ${className}`}
      {...props}
    />
  );
}
