import type { SupabaseClient } from "@supabase/supabase-js";

// Próxima posição livre numa tabela ordenável (etapas/opções/campos), para
// manter os itens em ordem. Compartilhado entre os server actions do admin.
export async function nextPosition(
  supabase: SupabaseClient,
  table: "steps" | "options" | "step_fields",
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
