"use server";

import { revalidatePath } from "next/cache";
import { createServerAuthClient } from "@/lib/supabase-server";
import { ensureProfile } from "@/lib/admin";

const PRODUCTS_PATH = "/admin/produtos";

// ---------------------------------------------------------------- CATEGORIAS

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const companyId = await ensureProfile();
  if (!companyId) return;

  const supabase = await createServerAuthClient();
  // Próxima posição (categorias da empresa em ordem).
  const { data: last } = await supabase
    .from("product_categories")
    .select("position")
    .eq("company_id", companyId)
    .order("position", { ascending: false })
    .limit(1);
  const position = ((last?.[0]?.position as number | undefined) ?? 0) + 1;

  const { error } = await supabase
    .from("product_categories")
    .insert({ company_id: companyId, name, position });
  if (error) throw new Error("Erro ao criar categoria: " + error.message);
  revalidatePath(PRODUCTS_PATH);
}

export async function renameCategory(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("product_categories")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error("Erro ao renomear categoria: " + error.message);
  revalidatePath(PRODUCTS_PATH);
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createServerAuthClient();
  // Os produtos da categoria ficam "sem categoria" (FK on delete set null).
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id);
  if (error) throw new Error("Erro ao excluir categoria: " + error.message);
  revalidatePath(PRODUCTS_PATH);
}

// Reordena as categorias (drag-n-drop): grava "position" pela ordem do array.
export async function reorderCategories(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const supabase = await createServerAuthClient();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("product_categories").update({ position: i }).eq("id", id)
    )
  );
  revalidatePath(PRODUCTS_PATH);
}

// ---------------------------------------------------------------- PRODUTOS

// Próxima posição (fim da lista) de uma categoria da empresa.
async function nextProductPosition(
  supabase: Awaited<ReturnType<typeof createServerAuthClient>>,
  companyId: string,
  categoryId: string | null
): Promise<number> {
  let query = supabase
    .from("products")
    .select("position")
    .eq("company_id", companyId)
    .order("position", { ascending: false })
    .limit(1);
  query = categoryId
    ? query.eq("category_id", categoryId)
    : query.is("category_id", null);
  const { data } = await query;
  return ((data?.[0]?.position as number | undefined) ?? -1) + 1;
}

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") || "Novo produto").trim() || "Novo produto";
  const categoryId = String(formData.get("category_id") || "") || null;
  const companyId = await ensureProfile();
  if (!companyId) return;

  const supabase = await createServerAuthClient();
  const position = await nextProductPosition(supabase, companyId, categoryId);
  const { error } = await supabase
    .from("products")
    .insert({ company_id: companyId, category_id: categoryId, name, position });
  if (error) throw new Error("Erro ao criar produto: " + error.message);
  revalidatePath(PRODUCTS_PATH);
}

// Reordena os produtos de uma categoria (drag-n-drop): grava "position" pela
// ordem do array. Os ids devem pertencer à mesma categoria.
export async function reorderProducts(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const supabase = await createServerAuthClient();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("products").update({ position: i }).eq("id", id)
    )
  );
  revalidatePath(PRODUCTS_PATH);
}

// Salva o produto INTEIRO de uma vez (todas as abas do modal): dados,
// especificações, ações e vídeos. Isso evita perder o conteúdo das abas que
// não estavam ativas ao clicar em "Salvar".
export async function saveProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createServerAuthClient();

  // --- Aba "Ações": catálogo de botões de ação (JSON validado). ---
  let actionButtons: unknown[] = [];
  try {
    const arr = JSON.parse(String(formData.get("action_buttons_json") || "[]"));
    if (Array.isArray(arr)) actionButtons = arr;
  } catch {
    actionButtons = [];
  }

  // --- Aba "Especificações". ---
  const enabled = String(formData.get("specs_enabled")) === "true";
  const specsSummary = String(formData.get("specs_summary") || "").trim() || null;
  let specRows: { attribute: string; value: string }[] = [];
  try {
    const arr = JSON.parse(String(formData.get("specs_json") || "[]"));
    if (Array.isArray(arr)) {
      specRows = arr
        .map((r) => ({
          attribute: String(r?.attribute || "").trim(),
          value: String(r?.value || "").trim(),
        }))
        .filter((r) => r.attribute !== "");
    }
  } catch {
    specRows = [];
  }

  // --- Aba "Vídeos" (+ timing da barra de destaques). ---
  const revealSeconds = Math.max(
    0,
    Math.trunc(Number(formData.get("highlights_reveal_seconds")) || 0)
  );
  let videoRows: {
    title: string;
    video_url: string;
    thumb_url: string;
    is_main: boolean;
    is_highlight: boolean;
    buttons: unknown[];
  }[] = [];
  try {
    const arr = JSON.parse(String(formData.get("videos_json") || "[]"));
    if (Array.isArray(arr)) {
      videoRows = arr
        .map((v) => ({
          title: String(v?.title || "").trim(),
          video_url: String(v?.video_url || "").trim(),
          thumb_url: String(v?.thumb_url || "").trim(),
          is_main: Boolean(v?.is_main),
          is_highlight: v?.is_highlight !== false,
          buttons: Array.isArray(v?.buttons) ? v.buttons : [],
        }))
        .filter((v) => v.video_url !== "");
    }
  } catch {
    videoRows = [];
  }
  // Garante no máximo 1 vídeo principal.
  let mainSeen = false;
  videoRows = videoRows.map((v) => {
    if (v.is_main && !mainSeen) {
      mainSeen = true;
      return v;
    }
    return { ...v, is_main: false };
  });

  // 1) Atualiza a linha do produto (dados + flags de specs + reveal + ações).
  const { error: upErr } = await supabase
    .from("products")
    .update({
      name: String(formData.get("name") || "").trim(),
      category_id: String(formData.get("category_id") || "") || null,
      tag: String(formData.get("tag") || "").trim() || null,
      tag_color: String(formData.get("tag_color") || "").trim() || null,
      buy_link: String(formData.get("buy_link") || "").trim() || null,
      summary: String(formData.get("summary") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      photo_url: String(formData.get("photo_url") || "").trim() || null,
      status: String(formData.get("status") || "draft"),
      specs_enabled: enabled,
      specs_summary: specsSummary,
      highlights_reveal_seconds: revealSeconds,
      action_buttons: actionButtons,
    })
    .eq("id", id);
  if (upErr) throw new Error("Erro ao salvar produto: " + upErr.message);

  // 2) Substitui as especificações.
  await supabase.from("product_specs").delete().eq("product_id", id);
  if (specRows.length > 0) {
    const { error } = await supabase.from("product_specs").insert(
      specRows.map((r, i) => ({
        product_id: id,
        attribute: r.attribute,
        value: r.value || null,
        position: i + 1,
      }))
    );
    if (error) throw new Error("Erro ao salvar atributos: " + error.message);
  }

  // 3) Substitui os vídeos (com os botões posicionados em cada um).
  await supabase.from("product_videos").delete().eq("product_id", id);
  if (videoRows.length > 0) {
    const { error } = await supabase.from("product_videos").insert(
      videoRows.map((v, i) => ({
        product_id: id,
        title: v.title || null,
        video_url: v.video_url,
        thumb_url: v.thumb_url || null,
        is_main: v.is_main,
        is_highlight: v.is_highlight,
        position: i + 1,
        buttons: v.buttons,
      }))
    );
    if (error) throw new Error("Erro ao salvar vídeos: " + error.message);
  }

  revalidatePath(PRODUCTS_PATH);
}

export async function duplicateProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createServerAuthClient();

  const { data: src, error: readErr } = await supabase
    .from("products")
    .select(
      "company_id, category_id, name, photo_url, benefits, buy_link, whatsapp, tag, tag_color, summary, description, status, specs_enabled, specs_summary, buttons, action_buttons, highlights_reveal_seconds"
    )
    .eq("id", id)
    .single();
  if (readErr || !src) throw new Error("Erro ao ler produto: " + readErr?.message);

  // A cópia entra no fim da mesma categoria.
  const position = src.company_id
    ? await nextProductPosition(supabase, src.company_id, src.category_id ?? null)
    : 0;
  const { data: novo, error } = await supabase
    .from("products")
    .insert({ ...src, name: `${src.name} (cópia)`, status: "draft", position })
    .select("id")
    .single();
  if (error || !novo) throw new Error("Erro ao duplicar produto: " + error?.message);

  // Copia specs e vídeos.
  const [{ data: specs }, { data: videos }] = await Promise.all([
    supabase.from("product_specs").select("attribute, value, position").eq("product_id", id),
    supabase
      .from("product_videos")
      .select("title, video_url, thumb_url, is_main, is_highlight, position, buttons")
      .eq("product_id", id),
  ]);
  if (specs && specs.length > 0) {
    await supabase
      .from("product_specs")
      .insert(specs.map((s) => ({ ...s, product_id: novo.id })));
  }
  if (videos && videos.length > 0) {
    await supabase
      .from("product_videos")
      .insert(videos.map((v) => ({ ...v, product_id: novo.id })));
  }
  revalidatePath(PRODUCTS_PATH);
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error("Erro ao excluir produto: " + error.message);
  revalidatePath(PRODUCTS_PATH);
}
