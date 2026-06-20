"use server";

import { revalidatePath } from "next/cache";
import { createServerAuthClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/admin";
import type { EventType } from "@/lib/supabase";

// Detalhe completo de um lead (para o popup).
export type LeadDetail = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  origin: string;
  dateLabel: string;
  // Respostas na ORDEM em que foram dadas (reconstruída pelos eventos).
  answers: { label: string; value: string }[];
  recommendedProducts: string[];
  ctaClicked: string | null;
  captured: boolean;
  capturedByName: string | null;
  capturedDateLabel: string | null;
  contactMethod: string | null;
  // Jornada de cliques (timeline de eventos da sessão).
  timeline: { label: string; at: string }[];
};

type DbLead = {
  id: string;
  journey_id: string | null;
  session_id: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  answers: Record<string, string> | null;
  recommended_products: string[] | null;
  cta_clicked: string | null;
  created_at: string;
  captured_at: string | null;
  captured_by_name: string | null;
  contact_method: string | null;
};

type DbEvent = {
  event_type: EventType;
  step_id: string | null;
  option_id: string | null;
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Rótulo amigável de cada evento da timeline.
function eventLabel(
  e: DbEvent,
  steps: Map<string, string>,
  options: Map<string, string>
): string {
  switch (e.event_type) {
    case "start":
      return "Iniciou a jornada";
    case "view_step":
      return `Assistiu: "${(e.step_id && steps.get(e.step_id)) || "etapa"}"`;
    case "click_option":
      return `Escolheu: "${(e.option_id && options.get(e.option_id)) || "opção"}"`;
    case "click_whatsapp":
      return "Clicou no WhatsApp";
    case "click_buy":
      return "Clicou no link de compra";
    case "view_specs":
      return "Abriu as especificações de um produto";
    case "click_highlight":
      return "Abriu um destaque de um produto";
    case "complete":
      return "Concluiu a jornada";
    default:
      return e.event_type;
  }
}

// Carrega TODO o detalhe de um lead + a timeline de cliques da sessão.
export async function loadLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const supabase = await createServerAuthClient();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, journey_id, session_id, name, email, whatsapp, answers, recommended_products, cta_clicked, created_at, captured_at, captured_by_name, contact_method"
    )
    .eq("id", leadId)
    .maybeSingle<DbLead>();

  if (!lead) return null;

  // Nome da jornada de origem.
  let origin = "—";
  if (lead.journey_id) {
    const { data: j } = await supabase
      .from("journeys")
      .select("name")
      .eq("id", lead.journey_id)
      .maybeSingle<{ name: string }>();
    origin = j?.name || "—";
  }

  // Eventos da sessão (a jornada de cliques).
  let events: DbEvent[] = [];
  if (lead.session_id) {
    const { data } = await supabase
      .from("events")
      .select("event_type, step_id, option_id, created_at")
      .eq("session_id", lead.session_id)
      .order("created_at")
      .returns<DbEvent[]>();
    events = data ?? [];
  }

  // Mapas de rótulo (etapa / opção) para a timeline.
  const stepIds = Array.from(
    new Set(events.map((e) => e.step_id).filter((v): v is string => Boolean(v)))
  );
  const optionIds = Array.from(
    new Set(events.map((e) => e.option_id).filter((v): v is string => Boolean(v)))
  );

  const steps = new Map<string, string>();
  const options = new Map<string, string>();
  await Promise.all([
    stepIds.length
      ? supabase
          .from("steps")
          .select("id, title, question_text")
          .in("id", stepIds)
          .then(({ data }) =>
            (data ?? []).forEach((s) =>
              steps.set(s.id, s.title || s.question_text || "etapa")
            )
          )
      : Promise.resolve(),
    optionIds.length
      ? supabase
          .from("options")
          .select("id, label")
          .in("id", optionIds)
          .then(({ data }) =>
            (data ?? []).forEach((o) => options.set(o.id, o.label))
          )
      : Promise.resolve(),
  ]);

  // Respostas na ORDEM em que foram respondidas: o JSONB não preserva a ordem
  // de inserção das chaves, mas os eventos (cronológicos) preservam. As chaves
  // das respostas de PERGUNTA são os títulos das etapas (steps Map); as de
  // COLETA (campos) não casam com etapas e entram ao final, na ordem do objeto.
  const answersObj = lead.answers ?? {};
  const orderedAnswers: { label: string; value: string }[] = [];
  const seenKeys = new Set<string>();
  for (const e of events) {
    if (!e.step_id) continue;
    const key = steps.get(e.step_id);
    if (key && key in answersObj && !seenKeys.has(key)) {
      seenKeys.add(key);
      orderedAnswers.push({ label: key, value: answersObj[key] });
    }
  }
  for (const k of Object.keys(answersObj)) {
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      orderedAnswers.push({ label: k, value: answersObj[k] });
    }
  }

  return {
    id: lead.id,
    name: lead.name || "—",
    email: lead.email || "—",
    whatsapp: lead.whatsapp || "—",
    origin,
    dateLabel: dateFmt.format(new Date(lead.created_at)),
    answers: orderedAnswers,
    recommendedProducts: lead.recommended_products ?? [],
    ctaClicked: lead.cta_clicked,
    captured: Boolean(lead.captured_at),
    capturedByName: lead.captured_by_name,
    capturedDateLabel: lead.captured_at
      ? timeFmt.format(new Date(lead.captured_at))
      : null,
    contactMethod: lead.contact_method,
    timeline: events.map((e) => ({
      label: eventLabel(e, steps, options),
      at: timeFmt.format(new Date(e.created_at)),
    })),
  };
}

// Captura o lead: registra quem capturou, quando e como entrou em contato.
// O lead então sai de "Novos" e passa para "Histórico".
export async function captureLead(formData: FormData) {
  const id = String(formData.get("id"));
  const contactMethod = String(formData.get("contact_method") || "").trim();
  if (!contactMethod) {
    throw new Error("Informe como você entrou em contato com o lead.");
  }

  const user = await getCurrentUser();
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");

  const supabase = await createServerAuthClient();

  // Nome do atendente (profile) para exibir no histórico.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();
  const capturedByName = profile?.full_name || user.email || "Atendente";

  const { error } = await supabase
    .from("leads")
    .update({
      captured_at: new Date().toISOString(),
      captured_by: user.id,
      captured_by_name: capturedByName,
      contact_method: contactMethod,
    })
    .eq("id", id);

  if (error) throw new Error("Erro ao capturar lead: " + error.message);
  revalidatePath("/admin/leads");
}
