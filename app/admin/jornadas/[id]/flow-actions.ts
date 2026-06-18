"use server";

import { createServerAuthClient } from "@/lib/supabase-server";
import type {
  Step,
  Option,
  StepType,
  ButtonLayout,
  ButtonTemplate,
  ButtonFont,
  ButtonShadow,
  QuestionPosition,
  QuestionFontSize,
  ButtonTextSize,
  WidgetFormat,
  WidgetPosition,
} from "@/lib/supabase";

// Colunas de ESTILO copiadas ao "replicar estilo" entre etapas.
const STYLE_COLS = [
  "buttons_layout",
  "button_template",
  "button_color",
  "button_opacity",
  "button_font_color",
  "button_font",
  "button_border_color",
  "button_shadow",
  "button_text_size",
  "question_position",
  "question_font_size",
  "question_font_color",
  "question_bg_enabled",
  "question_bg_color",
] as const;

// Colunas selecionadas ao devolver uma etapa/opção (mantém os tipos completos).
const STEP_COLS =
  "id, journey_id, type, title, question_text, video_url, position, pos_x, pos_y, buttons_layout, button_template, button_color, button_opacity, button_font_color, button_font, button_border_color, button_shadow, buttons_reveal_enabled, buttons_reveal_seconds, question_position, question_font_size, question_font_color, question_bg_enabled, question_bg_color, button_text_size";
const OPTION_COLS = "id, step_id, label, subtitle, icon, next_step_id, position";

// =====================================================================
// Server actions do FLOW BUILDER.
// Diferente de actions.ts, estas NÃO chamam revalidatePath: o canvas
// (React Flow) mantém seu próprio estado e atualiza na hora, sem recarregar.
// As de "...Returning" devolvem o registro criado para o canvas inseri-lo.
// =====================================================================

async function nextPosition(
  supabase: Awaited<ReturnType<typeof createServerAuthClient>>,
  table: "steps" | "options",
  column: "journey_id" | "step_id",
  value: string
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("position")
    .eq(column, value)
    .order("position", { ascending: false })
    .limit(1);
  return ((data?.[0]?.position as number | undefined) ?? 0) + 1;
}

// ---------------------------------------------------------------- ETAPAS

export async function addStepReturning(
  journeyId: string,
  type: StepType,
  posX: number,
  posY: number
): Promise<Step> {
  const supabase = await createServerAuthClient();
  const position = await nextPosition(supabase, "steps", "journey_id", journeyId);

  const { data, error } = await supabase
    .from("steps")
    .insert({
      journey_id: journeyId,
      type,
      title: type === "result" ? "Resultado" : "Nova etapa",
      position,
      pos_x: posX,
      pos_y: posY,
    })
    .select(STEP_COLS)
    .single<Step>();

  if (error || !data) throw new Error("Erro ao adicionar etapa: " + error?.message);
  return data;
}

export async function updateStepQuiet(
  stepId: string,
  fields: { title?: string; question_text?: string; type?: StepType }
) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("steps").update(fields).eq("id", stepId);
  if (error) throw new Error("Erro ao salvar etapa: " + error.message);
}

export async function deleteStepQuiet(stepId: string) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("steps").delete().eq("id", stepId);
  if (error) throw new Error("Erro ao excluir etapa: " + error.message);
}

export async function saveStepPosition(stepId: string, x: number, y: number) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("steps")
    .update({ pos_x: x, pos_y: y })
    .eq("id", stepId);
  if (error) throw new Error("Erro ao salvar posição: " + error.message);
}

export async function setStepVideoQuiet(stepId: string, videoUrl: string) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("steps")
    .update({ video_url: videoUrl })
    .eq("id", stepId);
  if (error) throw new Error("Erro ao salvar vídeo: " + error.message);
}

// Define a etapa inicial da jornada (sem recarregar o canvas).
export async function setStartStepQuiet(journeyId: string, stepId: string) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("journeys")
    .update({ start_step_id: stepId, updated_at: new Date().toISOString() })
    .eq("id", journeyId);
  if (error) throw new Error("Erro ao definir etapa inicial: " + error.message);
}

// ---------------------------------------------------------------- BOTÕES

export async function addOptionReturning(stepId: string): Promise<Option> {
  const supabase = await createServerAuthClient();
  const position = await nextPosition(supabase, "options", "step_id", stepId);

  const { data, error } = await supabase
    .from("options")
    .insert({ step_id: stepId, label: "Nova opção", position })
    .select(OPTION_COLS)
    .single<Option>();

  if (error || !data) throw new Error("Erro ao adicionar botão: " + error?.message);
  return data;
}

export async function updateOptionLabelQuiet(optionId: string, label: string) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("options")
    .update({ label })
    .eq("id", optionId);
  if (error) throw new Error("Erro ao salvar botão: " + error.message);
}

// Salva o conteúdo do botão: texto em destaque (label), texto secundário e ícone.
export async function updateOptionFieldsQuiet(
  optionId: string,
  fields: { label?: string; subtitle?: string | null; icon?: string | null }
) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("options")
    .update(fields)
    .eq("id", optionId);
  if (error) throw new Error("Erro ao salvar botão: " + error.message);
}

// Salva o estilo uniforme dos botões da etapa (layout, template, cores, opacidade).
export async function updateStepStyleQuiet(
  stepId: string,
  fields: {
    buttons_layout?: ButtonLayout;
    button_template?: ButtonTemplate;
    button_color?: string;
    button_opacity?: number;
    button_font_color?: string;
    button_font?: ButtonFont;
    button_border_color?: string;
    button_shadow?: ButtonShadow;
    buttons_reveal_enabled?: boolean;
    buttons_reveal_seconds?: number;
    question_position?: QuestionPosition;
    question_font_size?: QuestionFontSize;
    question_font_color?: string;
    question_bg_enabled?: boolean;
    question_bg_color?: string;
    button_text_size?: ButtonTextSize;
  }
) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("steps").update(fields).eq("id", stepId);
  if (error) throw new Error("Erro ao salvar estilo dos botões: " + error.message);
}

export async function deleteOptionQuiet(optionId: string) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("options").delete().eq("id", optionId);
  if (error) throw new Error("Erro ao excluir botão: " + error.message);
}

// Liga (ou desliga, com null) o botão à próxima etapa = a RAMIFICAÇÃO.
export async function setOptionTarget(
  optionId: string,
  nextStepId: string | null
) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("options")
    .update({ next_step_id: nextStepId })
    .eq("id", optionId);
  if (error) throw new Error("Erro ao conectar botão: " + error.message);
}

// ---------------------------------------------------------------- PRODUTOS

// Copia o ESTILO da etapa origem para TODAS as outras etapas de pergunta da
// jornada (o "replicar estilo"). Devolve o patch aplicado para o canvas
// atualizar o estado local sem recarregar.
export async function copyStepStyleToJourneyQuiet(
  journeyId: string,
  sourceStepId: string
): Promise<Record<string, unknown>> {
  const supabase = await createServerAuthClient();

  // 1) Lê o estilo da etapa origem.
  const { data: src, error: readErr } = await supabase
    .from("steps")
    .select(STYLE_COLS.join(", "))
    .eq("id", sourceStepId)
    .single<Record<string, unknown>>();
  if (readErr || !src)
    throw new Error("Erro ao ler estilo da etapa: " + readErr?.message);

  // 2) Aplica nas demais etapas de PERGUNTA da jornada (exceto a origem).
  const { error: upErr } = await supabase
    .from("steps")
    .update(src)
    .eq("journey_id", journeyId)
    .eq("type", "question")
    .neq("id", sourceStepId);
  if (upErr) throw new Error("Erro ao replicar estilo: " + upErr.message);

  return src;
}

// Salva as configurações do WIDGET (nível jornada).
export async function updateJourneyWidgetQuiet(
  journeyId: string,
  fields: {
    widget_format?: WidgetFormat;
    widget_border?: boolean;
    widget_position?: WidgetPosition;
    widget_size?: number;
    widget_border_color?: string;
  }
) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("journeys")
    .update(fields)
    .eq("id", journeyId);
  if (error) throw new Error("Erro ao salvar o widget: " + error.message);
}

export async function setStepProductsQuiet(stepId: string, productIds: string[]) {
  const supabase = await createServerAuthClient();
  await supabase.from("step_products").delete().eq("step_id", stepId);
  if (productIds.length > 0) {
    const rows = productIds.map((pid, i) => ({
      step_id: stepId,
      product_id: pid,
      position: i + 1,
    }));
    const { error } = await supabase.from("step_products").insert(rows);
    if (error) throw new Error("Erro ao vincular produtos: " + error.message);
  }
}
