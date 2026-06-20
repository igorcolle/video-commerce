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
      product_id,
      session_id,
      answers,
      recommended_products,
      cta_clicked,
      name,
      email,
      whatsapp,
    } = body ?? {};

    // Lead pode vir de uma JORNADA (journey_id) ou do PLAYER DE PRODUTO
    // (product_id). session_id é sempre obrigatório.
    if (!session_id || (!journey_id && !product_id)) {
      return NextResponse.json(
        { error: "session_id e (journey_id ou product_id) são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // --- Lead de PRODUTO (sem jornada): descobre a empresa pelo produto. ---
    if (product_id && !journey_id) {
      const { data: prod, error: pErr } = await supabase
        .from("products")
        .select("id, company_id")
        .eq("id", product_id)
        .single();

      if (pErr || !prod || !prod.company_id) {
        return NextResponse.json(
          { error: "Produto não encontrado." },
          { status: 404 }
        );
      }

      const { data, error } = await supabase
        .from("leads")
        .upsert(
          {
            product_id,
            company_id: prod.company_id,
            session_id,
            answers: answers ?? {},
            cta_clicked: cta_clicked ?? null,
            name: name ?? null,
            email: email ?? null,
            whatsapp: whatsapp ?? null,
          },
          { onConflict: "product_id,session_id" }
        )
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, lead_id: data.id });
    }

    // --- Lead de JORNADA (fluxo original). ---
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
