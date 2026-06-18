import { createServerSupabase } from "@/lib/supabase";
import type {
  Journey,
  Step,
  Option,
  Product,
  StepProduct,
  StepField,
} from "@/lib/supabase";

// =====================================================================
// Carrega TODA uma jornada publicada (jornada + etapas + botões +
// produtos + vínculos). Usado tanto pelo player em /j/<slug> quanto pela
// página de embed /embed/<slug>. Devolve null se não existir/estiver em
// rascunho — quem chama decide (notFound()).
// =====================================================================
export type LoadedJourney = {
  journey: Journey;
  steps: Step[];
  options: Option[];
  products: Product[];
  stepProducts: StepProduct[];
  stepFields: StepField[];
};

export async function loadJourney(slug: string): Promise<LoadedJourney | null> {
  const supabase = createServerSupabase();

  // 1) A jornada (precisa estar publicada).
  const { data: journey } = await supabase
    .from("journeys")
    .select("id, company_id, name, slug, status, start_step_id")
    .eq("slug", slug)
    .eq("status", "published")
    .single<Journey>();

  if (!journey) return null;

  // 2) Todas as etapas da jornada (ordenadas).
  const { data: steps } = await supabase
    .from("steps")
    .select(
      "id, journey_id, type, title, question_text, video_url, position, next_step_id, buttons_layout, button_template, button_color, button_opacity, button_font_color, button_font, button_border_color, button_shadow, buttons_reveal_enabled, buttons_reveal_seconds, question_position, question_font_size, question_font_color, question_bg_enabled, question_bg_color, button_text_size"
    )
    .eq("journey_id", journey.id)
    .order("position")
    .returns<Step[]>();

  const stepIds = (steps ?? []).map((s) => s.id);
  const safeIds = stepIds.length
    ? stepIds
    : ["00000000-0000-0000-0000-000000000000"];

  // 3) Os botões (opções) de todas as etapas.
  const { data: options } = await supabase
    .from("options")
    .select("id, step_id, label, subtitle, icon, next_step_id, position")
    .in("step_id", safeIds)
    .order("position")
    .returns<Option[]>();

  // 4) Os produtos da jornada.
  const { data: products } = await supabase
    .from("products")
    .select("id, journey_id, name, photo_url, benefits, buy_link, whatsapp")
    .eq("journey_id", journey.id)
    .returns<Product[]>();

  // 5) Quais produtos aparecem em cada etapa de resultado.
  const { data: stepProducts } = await supabase
    .from("step_products")
    .select("step_id, product_id, position")
    .in("step_id", safeIds)
    .order("position")
    .returns<StepProduct[]>();

  // 6) Os campos de formulário das etapas de "coleta de dados".
  const { data: stepFields } = await supabase
    .from("step_fields")
    .select("id, step_id, kind, label, required, position")
    .in("step_id", safeIds)
    .order("position")
    .returns<StepField[]>();

  return {
    journey,
    steps: steps ?? [],
    options: options ?? [],
    products: products ?? [],
    stepProducts: stepProducts ?? [],
    stepFields: stepFields ?? [],
  };
}
