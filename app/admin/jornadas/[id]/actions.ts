"use server";

import { revalidatePath } from "next/cache";
import { createServerAuthClient } from "@/lib/supabase-server";
import { nextPosition } from "@/lib/nextPosition";

// Caminho do editor (para revalidar a tela após cada mudança).
function editorPath(journeyId: string) {
  return `/admin/jornadas/${journeyId}`;
}

// ---------------------------------------------------------------- JORNADA

// Salva dados gerais da jornada (nome, slug, etapa inicial).
export async function updateJourney(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const startStepId = String(formData.get("start_step_id") || "");

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("journeys")
    .update({
      name,
      slug,
      start_step_id: startStepId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error("Erro ao salvar jornada: " + error.message);
  revalidatePath(editorPath(id));
}

// Publica ou volta para rascunho.
export async function togglePublish(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")); // novo status desejado

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("journeys")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error("Erro ao publicar: " + error.message);
  revalidatePath(editorPath(id));
}

// ---------------------------------------------------------------- ETAPAS

export async function addStep(formData: FormData) {
  const journeyId = String(formData.get("journey_id"));
  const type = String(formData.get("type") || "question");

  const supabase = await createServerAuthClient();
  const position = await nextPosition(supabase, "steps", "journey_id", journeyId);

  const { error } = await supabase.from("steps").insert({
    journey_id: journeyId,
    type,
    title: type === "result" ? "Resultado" : "Nova etapa",
    position,
  });

  if (error) throw new Error("Erro ao adicionar etapa: " + error.message);
  revalidatePath(editorPath(journeyId));
}

export async function updateStep(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));
  const title = String(formData.get("title") || "").trim();
  const questionText = String(formData.get("question_text") || "").trim();
  const type = String(formData.get("type") || "question");

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("steps")
    .update({ title, question_text: questionText, type })
    .eq("id", id);

  if (error) throw new Error("Erro ao salvar etapa: " + error.message);
  revalidatePath(editorPath(journeyId));
}

export async function deleteStep(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));

  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("steps").delete().eq("id", id);
  if (error) throw new Error("Erro ao excluir etapa: " + error.message);
  revalidatePath(editorPath(journeyId));
}

// Move uma etapa para cima/baixo, trocando a posição com a vizinha.
export async function moveStep(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));
  const direction = String(formData.get("direction")); // "up" | "down"

  const supabase = await createServerAuthClient();
  const { data: steps } = await supabase
    .from("steps")
    .select("id, position")
    .eq("journey_id", journeyId)
    .order("position");

  if (!steps) return;
  const idx = steps.findIndex((s) => s.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= steps.length) return;

  const a = steps[idx];
  const b = steps[swapIdx];
  // Troca as posições entre as duas etapas.
  await supabase.from("steps").update({ position: b.position }).eq("id", a.id);
  await supabase.from("steps").update({ position: a.position }).eq("id", b.id);

  revalidatePath(editorPath(journeyId));
}

// Salva o link do vídeo de uma etapa (usado pelo upload). Args diretos
// para poder ser chamado de um componente client.
export async function setStepVideo(
  stepId: string,
  journeyId: string,
  videoUrl: string
) {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("steps")
    .update({ video_url: videoUrl })
    .eq("id", stepId);

  if (error) throw new Error("Erro ao salvar vídeo: " + error.message);
  revalidatePath(editorPath(journeyId));
}

// ---------------------------------------------------------------- BOTÕES

export async function addOption(formData: FormData) {
  const stepId = String(formData.get("step_id"));
  const journeyId = String(formData.get("journey_id"));
  const label = String(formData.get("label") || "").trim();
  if (!label) return;

  const supabase = await createServerAuthClient();
  const position = await nextPosition(supabase, "options", "step_id", stepId);

  const { error } = await supabase
    .from("options")
    .insert({ step_id: stepId, label, position });
  if (error) throw new Error("Erro ao adicionar botão: " + error.message);
  revalidatePath(editorPath(journeyId));
}

export async function updateOption(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));
  const label = String(formData.get("label") || "").trim();
  const nextStepId = String(formData.get("next_step_id") || "");

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("options")
    .update({ label, next_step_id: nextStepId || null })
    .eq("id", id);
  if (error) throw new Error("Erro ao salvar botão: " + error.message);
  revalidatePath(editorPath(journeyId));
}

export async function deleteOption(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));

  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("options").delete().eq("id", id);
  if (error) throw new Error("Erro ao excluir botão: " + error.message);
  revalidatePath(editorPath(journeyId));
}

// ---------------------------------------------------------------- PRODUTOS

export async function addProduct(formData: FormData) {
  const journeyId = String(formData.get("journey_id"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("products")
    .insert({ journey_id: journeyId, name });
  if (error) throw new Error("Erro ao adicionar produto: " + error.message);
  revalidatePath(editorPath(journeyId));
}

// Lê o JSON dos botões de ação (vindo do <ProductButtons/>), valida e
// devolve no máximo 2 botões com valor preenchido.
function parseButtons(raw: string): { kind: string; label: string; value: string }[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((b) => b && (b.kind === "whatsapp" || b.kind === "custom"))
      .map((b) => ({
        kind: b.kind,
        label: String(b.label || "").trim(),
        value: String(b.value || "").trim(),
      }))
      .filter((b) => b.value !== "") // descarta linhas sem destino
      .slice(0, 2);
  } catch {
    return [];
  }
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));
  const buttons = parseButtons(String(formData.get("buttons_json") || "[]"));

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: String(formData.get("name") || "").trim(),
      photo_url: String(formData.get("photo_url") || "").trim() || null,
      benefits: String(formData.get("benefits") || "").trim() || null,
      buy_link: String(formData.get("buy_link") || "").trim() || null,
      buttons,
    })
    .eq("id", id);
  if (error) throw new Error("Erro ao salvar produto: " + error.message);
  revalidatePath(editorPath(journeyId));
}

// Duplica um produto (com seus botões), criando uma cópia "(cópia)".
export async function duplicateProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));

  const supabase = await createServerAuthClient();
  const { data: src, error: readErr } = await supabase
    .from("products")
    .select("name, photo_url, benefits, buy_link, buttons")
    .eq("id", id)
    .single();
  if (readErr || !src)
    throw new Error("Erro ao ler produto: " + readErr?.message);

  const { error } = await supabase.from("products").insert({
    journey_id: journeyId,
    name: `${src.name} (cópia)`,
    photo_url: src.photo_url,
    benefits: src.benefits,
    buy_link: src.buy_link,
    buttons: src.buttons ?? [],
  });
  if (error) throw new Error("Erro ao duplicar produto: " + error.message);
  revalidatePath(editorPath(journeyId));
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const journeyId = String(formData.get("journey_id"));

  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error("Erro ao excluir produto: " + error.message);
  revalidatePath(editorPath(journeyId));
}

// Define quais produtos aparecem numa etapa de resultado (substitui o set).
export async function setStepProducts(formData: FormData) {
  const stepId = String(formData.get("step_id"));
  const journeyId = String(formData.get("journey_id"));
  const productIds = formData.getAll("product_ids").map((v) => String(v));

  const supabase = await createServerAuthClient();

  // Apaga os vínculos atuais e recria com os selecionados.
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

  revalidatePath(editorPath(journeyId));
}
