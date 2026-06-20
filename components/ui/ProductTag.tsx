// =====================================================================
// ProductTag — pílula minimalista e discreta da tag do produto.
// Mostrada NA FRENTE do nome do produto (lista admin e cards dos players).
// Fundo translúcido derivado da cor da tag; texto na própria cor.
// Não renderiza nada quando não há tag.
// =====================================================================

type Props = {
  tag: string | null | undefined;
  color: string | null | undefined;
  className?: string;
};

export default function ProductTag({ tag, color, className = "" }: Props) {
  const t = (tag ?? "").trim();
  if (!t) return null;

  // Cor base (hex). Acrescenta alfa em hex (8 dígitos) para fundo/borda suaves.
  const base = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6b7280";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide ${className}`}
      style={{
        color: base,
        backgroundColor: `${base}1f`, // ~12% de opacidade
        border: `1px solid ${base}33`, // ~20% de opacidade
      }}
    >
      {t}
    </span>
  );
}
