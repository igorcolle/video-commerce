"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase-server";
import { ensureProfile } from "@/lib/admin";

// Transforma "Escolha sua roçadeira" em "escolha-sua-rocadeira".
function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// Cria uma nova jornada (rascunho) e abre o editor dela.
export async function createJourney(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const companyId = await ensureProfile();
  if (!companyId) redirect("/admin/login");

  const supabase = await createServerAuthClient();

  // slug único: base + sufixo curto para evitar colisão.
  const base = slugify(name) || "jornada";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase
    .from("journeys")
    .insert({ company_id: companyId, name, slug, status: "draft" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Não foi possível criar a jornada: " + error?.message);
  }

  revalidatePath("/admin/jornadas");
  redirect(`/admin/jornadas/${data.id}`);
}

// Exclui uma jornada inteira (a RLS garante que é da própria empresa).
export async function deleteJourney(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const supabase = await createServerAuthClient();
  const { error } = await supabase.from("journeys").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir: " + error.message);

  revalidatePath("/admin/jornadas");
}
