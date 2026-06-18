// =====================================================================
// Clientes do Supabase
//
// Existem DOIS jeitos de falar com o banco:
//
// 1) createBrowserSupabase()  -> usa a chave PÚBLICA "anon".
//    Pode rodar no navegador. A segurança vem das regras RLS do banco
//    (o visitante só lê jornadas publicadas e só insere eventos/leads).
//
// 2) createServerSupabase()   -> usa a chave SECRETA "service_role".
//    SÓ PODE rodar no servidor (rotas /api e Server Components).
//    NUNCA importe isto em um componente "use client". A chave ignora
//    o RLS, então ela jamais pode chegar ao navegador.
// =====================================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente para o NAVEGADOR (componentes "use client").
export function createBrowserSupabase() {
  if (!url || !anonKey) {
    throw new Error(
      "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Veja SETUP_SUPABASE.md."
    );
  }
  return createClient(url, anonKey);
}

// Cliente para o SERVIDOR (rotas /api e Server Components). Usa a chave secreta.
export function createServerSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Veja SETUP_SUPABASE.md."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// =====================================================================
// Tipos mínimos das tabelas usadas nesta fase (espelham supabase_schema.sql).
// =====================================================================

export type StepType = "question" | "result" | "collect";

// Tipos de campo do formulário de uma etapa de "coleta de dados".
export type FieldKind = "full_name" | "email" | "whatsapp" | "custom";

// Aparência dos botões de decisão (escolhida no admin, por etapa).
export type ButtonLayout = "stack" | "grid";
export type ButtonTemplate = "solid" | "glass" | "outline" | "soft";
export type ButtonFont = "inter" | "roboto" | "poppins" | "montserrat" | "lato";
export type ButtonShadow = "none" | "sm" | "md" | "lg" | "glow";
export type QuestionPosition = "top" | "center" | "bottom";
export type QuestionFontSize = "sm" | "md" | "lg" | "xl";
export type ButtonTextSize = "sm" | "md" | "lg";

// Formato da bolha de preview do widget no site do cliente.
export type WidgetFormat = "square" | "rectangle" | "circle";
export type WidgetPosition = "right" | "left";

export type Journey = {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  status: "draft" | "published";
  start_step_id: string | null;
  // Configurações do widget (defaults no banco — ver supabase_widget.sql).
  widget_format?: WidgetFormat | null;
  widget_border?: boolean | null;
  widget_position?: WidgetPosition | null;
  // Tamanho (%) e cor da borda — ver supabase_widget_size_color.sql.
  widget_size?: number | null;
  widget_border_color?: string | null;
};

export type Step = {
  id: string;
  journey_id: string;
  type: StepType;
  title: string | null;
  question_text: string | null;
  video_url: string | null;
  position: number;
  // Próxima etapa das etapas lineares (coleta de dados) — ver supabase_collect_step.sql.
  next_step_id?: string | null;
  // Posição do bloco no flow builder (preenchido ao arrastar; pode ser null).
  pos_x?: number | null;
  pos_y?: number | null;
  // Estilo uniforme dos botões desta etapa (defaults no banco).
  buttons_layout?: ButtonLayout | null;
  button_template?: ButtonTemplate | null;
  button_color?: string | null;
  button_opacity?: number | null;
  button_font_color?: string | null;
  button_font?: ButtonFont | null;
  button_border_color?: string | null;
  button_shadow?: ButtonShadow | null;
  buttons_reveal_enabled?: boolean | null;
  buttons_reveal_seconds?: number | null;
  question_position?: QuestionPosition | null;
  // Estilo da pergunta (texto que aparece sobre o vídeo).
  question_font_size?: QuestionFontSize | null;
  question_font_color?: string | null;
  question_bg_enabled?: boolean | null;
  question_bg_color?: string | null;
  // Tamanho do texto dos botões de decisão.
  button_text_size?: ButtonTextSize | null;
  // Botão de ação geral (CTA) da etapa de resultado (configurável no admin).
  result_cta?: ProductButton | null;
};

// Botão de ação de um produto (ou CTA geral): WhatsApp ou link personalizado.
//   whatsapp → value = número com DDI; label = texto do botão.
//   custom   → label = nome do botão; value = link de destino.
export type ProductButton = {
  kind: "whatsapp" | "custom";
  label: string;
  value: string;
};

export type Option = {
  id: string;
  step_id: string;
  label: string;            // texto em destaque
  subtitle?: string | null; // texto secundário
  icon?: string | null;     // emoji opcional
  next_step_id: string | null;
  position: number;
};

// Campo do formulário de uma etapa de "coleta de dados" (ver step_fields).
export type StepField = {
  id: string;
  step_id: string;
  kind: FieldKind;
  label: string;      // rótulo do campo (na "custom" é a própria pergunta)
  required: boolean;
  position: number;
};

export type Product = {
  id: string;
  journey_id: string;
  name: string;
  photo_url: string | null;
  benefits: string | null;
  buy_link: string | null;
  whatsapp: string | null;
  // Até 2 botões de ação configuráveis (WhatsApp / personalizado).
  buttons: ProductButton[];
};

export type StepProduct = {
  step_id: string;
  product_id: string;
  position: number;
};

// Tipos de evento que o player registra (alimentam o dashboard futuro).
export type EventType =
  | "start"
  | "view_step"
  | "click_option"
  | "click_whatsapp"
  | "click_buy"
  | "complete";
