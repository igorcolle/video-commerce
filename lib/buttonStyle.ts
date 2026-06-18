// =====================================================================
// Fonte ÚNICA de estilo dos botões de decisão.
// Usada tanto no player (VideoStep) quanto na pré-visualização do admin,
// para que o que o admin vê seja exatamente o que o cliente final vê.
// =====================================================================

import type { CSSProperties } from "react";
import type {
  ButtonLayout,
  ButtonTemplate,
  ButtonFont,
  ButtonShadow,
  QuestionPosition,
  QuestionFontSize,
  ButtonTextSize,
  Step,
} from "./supabase";

// Paleta de amostras (o admin clica; não digita código de cor).
export const PALETTE: string[] = [
  "#ffffff", "#111827", "#1f2937", "#374151",
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#16a34a", "#10b981", "#14b8a6",
  "#3b82f6", "#2563eb", "#6366f1", "#8b5cf6",
  "#a855f7", "#ec4899", "#f43f5e", "#000000",
];

// Templates disponíveis, com nome amigável em PT para o seletor do admin.
export const TEMPLATES: { id: ButtonTemplate; name: string }[] = [
  { id: "solid", name: "Sólido" },
  { id: "glass", name: "Vidro (desfoque)" },
  { id: "outline", name: "Contorno" },
  { id: "soft", name: "Suave" },
];

export const LAYOUTS: { id: ButtonLayout; name: string }[] = [
  { id: "stack", name: "Empilhado" },
  { id: "grid", name: "Grade (2 colunas)" },
];

// Fontes disponíveis. cssVar é definida em app/layout.tsx (next/font/google).
export const FONTS: { id: ButtonFont; name: string; cssVar: string }[] = [
  { id: "inter", name: "Inter", cssVar: "--font-inter" },
  { id: "roboto", name: "Roboto", cssVar: "--font-roboto" },
  { id: "poppins", name: "Poppins", cssVar: "--font-poppins" },
  { id: "montserrat", name: "Montserrat", cssVar: "--font-montserrat" },
  { id: "lato", name: "Lato", cssVar: "--font-lato" },
];

// Presets de sombra (box-shadow inline; valores fortes para destacar no vídeo).
export const SHADOWS: { id: ButtonShadow; name: string; boxShadow: string }[] = [
  { id: "none", name: "Nenhuma", boxShadow: "none" },
  { id: "sm", name: "Leve", boxShadow: "0 1px 3px rgba(0,0,0,0.40)" },
  { id: "md", name: "Média", boxShadow: "0 4px 12px rgba(0,0,0,0.45)" },
  { id: "lg", name: "Forte", boxShadow: "0 10px 28px rgba(0,0,0,0.60)" },
  { id: "glow", name: "Brilho", boxShadow: "0 0 18px rgba(255,255,255,0.55)" },
];

export const QUESTION_POSITIONS: { id: QuestionPosition; name: string }[] = [
  { id: "top", name: "Topo" },
  { id: "center", name: "Meio" },
  { id: "bottom", name: "Base" },
];

// Tamanhos da fonte da pergunta (classe responsiva: mobile → tablet+).
export const QUESTION_FONT_SIZES: {
  id: QuestionFontSize;
  name: string;
  className: string;
}[] = [
  { id: "sm", name: "Pequeno", className: "text-base sm:text-lg" },
  { id: "md", name: "Médio", className: "text-lg sm:text-xl" },
  { id: "lg", name: "Grande", className: "text-xl sm:text-2xl" },
  { id: "xl", name: "Muito grande", className: "text-2xl sm:text-3xl" },
];

// Tamanhos do texto dos botões (texto em destaque + subtítulo).
export const BUTTON_TEXT_SIZES: {
  id: ButtonTextSize;
  name: string;
  labelClass: string;
  subtitleClass: string;
}[] = [
  { id: "sm", name: "Pequeno", labelClass: "text-sm sm:text-base", subtitleClass: "text-[11px] sm:text-xs" },
  { id: "md", name: "Médio", labelClass: "text-base sm:text-lg", subtitleClass: "text-xs sm:text-sm" },
  { id: "lg", name: "Grande", labelClass: "text-lg sm:text-xl", subtitleClass: "text-sm sm:text-base" },
];

// Valores padrão (espelham os defaults do banco). Centralizados para o admin
// inicializar campos e o player ter retrocompatibilidade com jornadas antigas.
export const DEFAULT_BUTTON_STYLE = {
  buttons_layout: "stack" as ButtonLayout,
  button_template: "solid" as ButtonTemplate,
  button_color: "#ffffff",
  button_opacity: 90,
  button_font_color: "#111827",
  button_font: "inter" as ButtonFont,
  button_border_color: "",
  button_shadow: "md" as ButtonShadow,
  buttons_reveal_enabled: false,
  buttons_reveal_seconds: 5,
  question_position: "top" as QuestionPosition,
  question_font_size: "md" as QuestionFontSize,
  question_font_color: "#ffffff",
  question_bg_enabled: true,
  question_bg_color: "#000000",
  button_text_size: "md" as ButtonTextSize,
};

// Família CSS de uma fonte (referencia a variável carregada no layout).
export function fontFamilyOf(font: ButtonFont): string {
  const f = FONTS.find((x) => x.id === font) ?? FONTS[0];
  return `var(${f.cssVar}), sans-serif`;
}

// Valor box-shadow de um preset.
export function boxShadowOf(shadow: ButtonShadow): string {
  return (SHADOWS.find((s) => s.id === shadow) ?? SHADOWS[2]).boxShadow;
}

// Classe da zona da pergunta (posiciona o título no topo/meio/base do vídeo).
export function questionPositionClass(pos: QuestionPosition): string {
  const v =
    pos === "center" ? "items-center" : pos === "bottom" ? "items-end" : "items-start";
  return `flex flex-1 justify-center ${v}`;
}

// Converte "#rrggbb" (ou "#rgb") + opacidade (0–100) em rgba().
function hexToRgba(hex: string, opacity: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = Math.max(0, Math.min(100, opacity)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Lê o estilo da etapa, caindo nos defaults quando algum campo estiver vazio.
export function resolveButtonStyle(step: Step) {
  return {
    layout: step.buttons_layout ?? DEFAULT_BUTTON_STYLE.buttons_layout,
    template: step.button_template ?? DEFAULT_BUTTON_STYLE.button_template,
    color: step.button_color ?? DEFAULT_BUTTON_STYLE.button_color,
    opacity: step.button_opacity ?? DEFAULT_BUTTON_STYLE.button_opacity,
    fontColor: step.button_font_color ?? DEFAULT_BUTTON_STYLE.button_font_color,
    font: step.button_font ?? DEFAULT_BUTTON_STYLE.button_font,
    borderColor: step.button_border_color ?? DEFAULT_BUTTON_STYLE.button_border_color,
    shadow: step.button_shadow ?? DEFAULT_BUTTON_STYLE.button_shadow,
    revealEnabled:
      step.buttons_reveal_enabled ?? DEFAULT_BUTTON_STYLE.buttons_reveal_enabled,
    revealSeconds:
      step.buttons_reveal_seconds ?? DEFAULT_BUTTON_STYLE.buttons_reveal_seconds,
    questionPosition:
      step.question_position ?? DEFAULT_BUTTON_STYLE.question_position,
    questionFontSize:
      step.question_font_size ?? DEFAULT_BUTTON_STYLE.question_font_size,
    questionFontColor:
      step.question_font_color ?? DEFAULT_BUTTON_STYLE.question_font_color,
    questionBgEnabled:
      step.question_bg_enabled ?? DEFAULT_BUTTON_STYLE.question_bg_enabled,
    questionBgColor:
      step.question_bg_color ?? DEFAULT_BUTTON_STYLE.question_bg_color,
    buttonTextSize:
      step.button_text_size ?? DEFAULT_BUTTON_STYLE.button_text_size,
  };
}

// Classe de tamanho da fonte da pergunta.
export function questionFontSizeClass(size: QuestionFontSize): string {
  return (
    QUESTION_FONT_SIZES.find((s) => s.id === size) ?? QUESTION_FONT_SIZES[1]
  ).className;
}

// Classes de tamanho do texto do botão (destaque + subtítulo).
export function buttonTextSizeClass(size: ButtonTextSize): {
  label: string;
  subtitle: string;
} {
  const s = BUTTON_TEXT_SIZES.find((x) => x.id === size) ?? BUTTON_TEXT_SIZES[1];
  return { label: s.labelClass, subtitle: s.subtitleClass };
}

// Estilo inline do fundo da pergunta (fundo on/off + cor com leve opacidade).
// Quando o fundo está desligado, não aplica cor nem padding extra.
export function questionBoxStyle(
  enabled: boolean,
  bgColor: string,
  fontColor: string
): CSSProperties {
  const style: CSSProperties = { color: fontColor };
  if (enabled) style.backgroundColor = hexToRgba(bgColor, 45);
  return style;
}

// Classe do container que organiza os botões: empilhado x grade de 2 colunas.
export function optionsContainerClass(layout: ButtonLayout): string {
  return layout === "grid" ? "grid grid-cols-2" : "grid grid-cols-1";
}

// Traduz o estilo da etapa em { className (Tailwind) + style (inline) }
// aplicáveis a cada botão. Aceita o Step inteiro (player) ou um estilo parcial
// (pré-visualização do admin enquanto edita).
export function optionButtonVisual(
  src: Step | Partial<ReturnType<typeof resolveButtonStyle>>
): { className: string; style: CSSProperties } {
  const s =
    "layout" in src || "template" in src
      ? { ...resolveButtonStyle({} as Step), ...(src as object) }
      : resolveButtonStyle(src as Step);
  const { template, color, opacity, fontColor, font, borderColor, shadow } =
    s as ReturnType<typeof resolveButtonStyle>;

  let className =
    "rounded-2xl px-5 py-3.5 text-left transition-transform active:scale-[.98]";
  const style: CSSProperties = {
    color: fontColor,
    fontFamily: fontFamilyOf(font),
    boxShadow: boxShadowOf(shadow),
  };

  switch (template) {
    case "glass":
      className += " backdrop-blur-md";
      style.backgroundColor = hexToRgba(color, opacity);
      style.border = "1px solid rgba(255, 255, 255, 0.25)";
      break;
    case "outline":
      style.backgroundColor = hexToRgba(color, Math.min(opacity, 15));
      style.border = `2px solid ${hexToRgba(color, 100)}`;
      break;
    case "soft":
      style.backgroundColor = hexToRgba(color, Math.min(opacity, 35));
      break;
    case "solid":
    default:
      style.backgroundColor = hexToRgba(color, opacity);
      break;
  }

  // Cor de borda personalizada sobrepõe a borda do template.
  if (borderColor) style.border = `2px solid ${borderColor}`;

  return { className, style };
}
