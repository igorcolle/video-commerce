import { ensureProfile } from "@/lib/admin";
import { createServerAuthClient } from "@/lib/supabase-server";
import LeadsClient, { type LeadRow } from "@/components/admin/leads/LeadsClient";

export const dynamic = "force-dynamic";

// Lead como vem do banco (colunas usadas na listagem).
type DbLead = {
  id: string;
  journey_id: string | null;
  product_id: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  created_at: string;
  captured_at: string | null;
  captured_by_name: string | null;
};

// Página de LEADS: oportunidades geradas pelas jornadas (lê a tabela leads).
export default async function LeadsPage() {
  await ensureProfile();
  const supabase = await createServerAuthClient();

  // Leads, jornadas e produtos (para o nome de origem). RLS já filtra por empresa.
  const [{ data: leads }, { data: journeys }, { data: products }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, journey_id, product_id, name, email, whatsapp, created_at, captured_at, captured_by_name"
      )
      .order("created_at", { ascending: false })
      .returns<DbLead[]>(),
    supabase.from("journeys").select("id, name").returns<
      { id: string; name: string }[]
    >(),
    supabase.from("products").select("id, name").returns<
      { id: string; name: string }[]
    >(),
  ]);

  const journeyName = new Map((journeys ?? []).map((j) => [j.id, j.name]));
  const productName = new Map((products ?? []).map((p) => [p.id, p.name]));

  // Formata a data no servidor (evita divergência de locale na hidratação).
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  // Data + hora da captura (mostrada na aba Histórico).
  const fmtDateTime = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows: LeadRow[] = (leads ?? []).map((l) => ({
    id: l.id,
    name: l.name || "—",
    email: l.email || "—",
    phone: l.whatsapp || "—",
    origin:
      (l.journey_id && journeyName.get(l.journey_id)) ||
      (l.product_id && productName.get(l.product_id)) ||
      "—",
    dateLabel: fmt.format(new Date(l.created_at)),
    // "Capturado" = já foi para o histórico (tem captured_at).
    captured: Boolean(l.captured_at),
    capturedByName: l.captured_by_name,
    capturedAtLabel: l.captured_at
      ? fmtDateTime.format(new Date(l.captured_at))
      : "—",
  }));

  return <LeadsClient leads={rows} />;
}
