import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// =====================================================================
// POST /api/leads
// Cria UM lead qualificado ao final da jornada (ou no clique do CTA).
// Guarda as respostas dadas e os produtos recomendados.
// Roda só no servidor (usa a chave service_role).
//
// Corpo esperado (JSON):
//   { journey_id, session_id, answers, recommended_products,
//     cta_clicked?, name?, email?, whatsapp? }
//
// Faz UPSERT por (journey_id, session_id): há 1 lead por visita, atualizado
// ao longo da jornada (ex.: form de coleta no meio + resultado no fim).
//
// LGPD: name/email/whatsapp são dados pessoais — só guardamos se vierem
// preenchidos e tratamos com cuidado.
// =====================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      journey_id,
      session_id,
      answers,
      recommended_products,
      cta_clicked,
      name,
      email,
      whatsapp,
    } = body ?? {};

    if (!journey_id || !session_id) {
      return NextResponse.json(
        { error: "journey_id e session_id são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Descobre a empresa dona da jornada (e confirma publicação).
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

    const { data, error } = await supabase
      .from("leads")
      .upsert(
        {
          journey_id,
          company_id: journey.company_id,
          session_id,
          answers: answers ?? {},
          recommended_products: recommended_products ?? [],
          cta_clicked: cta_clicked ?? null,
          name: name ?? null,
          email: email ?? null,
          whatsapp: whatsapp ?? null,
        },
        { onConflict: "journey_id,session_id" }
      )
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lead_id: data.id });
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}
