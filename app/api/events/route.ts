import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import type { EventType } from "@/lib/supabase";

// =====================================================================
// POST /api/events
// Registra UMA ação do visitante no player. É o que vai alimentar o
// dashboard depois. Roda só no servidor (usa a chave service_role).
//
// Corpo esperado (JSON):
//   { journey_id, session_id, event_type, step_id?, option_id?, metadata? }
// =====================================================================

const VALID_EVENTS: EventType[] = [
  "start",
  "view_step",
  "click_option",
  "click_whatsapp",
  "click_buy",
  "complete",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { journey_id, session_id, event_type, step_id, option_id, metadata } =
      body ?? {};

    // Validação básica do que é obrigatório.
    if (!journey_id || !session_id || !event_type) {
      return NextResponse.json(
        { error: "journey_id, session_id e event_type são obrigatórios." },
        { status: 400 }
      );
    }
    if (!VALID_EVENTS.includes(event_type)) {
      return NextResponse.json(
        { error: `event_type inválido: ${event_type}` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Descobre a empresa dona da jornada (e confirma que ela está publicada).
    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("id, company_id, status")
      .eq("id", journey_id)
      .single();

    if (jErr || !journey || journey.status !== "published") {
      return NextResponse.json(
        { error: "Jornada não encontrada ou não publicada." },
        { status: 404 }
      );
    }

    const { error } = await supabase.from("events").insert({
      journey_id,
      company_id: journey.company_id,
      session_id,
      step_id: step_id ?? null,
      option_id: option_id ?? null,
      event_type,
      metadata: metadata ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}
