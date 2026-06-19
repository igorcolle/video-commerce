import { createServerSupabase } from "@/lib/supabase";
import {
  STEP_COLUMNS,
  OPTION_COLUMNS,
  FIELD_COLUMNS,
  PRODUCT_COLUMNS,
  STEP_PRODUCT_COLUMNS,
} from "@/lib/queries";
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

  // 2) Etapas e produtos só dependem da jornada → buscam em paralelo.
  const [{ data: steps }, { data: products }] = await Promise.all([
    supabase
      .from("steps")
      .select(STEP_COLUMNS)
      .eq("journey_id", journey.id)
      .order("position")
      .returns<Step[]>(),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("journey_id", journey.id)
      .returns<Product[]>(),
  ]);

  const stepIds = (steps ?? []).map((s) => s.id);
  const safeIds = stepIds.length
    ? stepIds
    : ["00000000-0000-0000-0000-000000000000"];

  // 3) Opções, vínculos de produto e campos dependem dos stepIds → paralelo.
  const [{ data: options }, { data: stepProducts }, { data: stepFields }] =
    await Promise.all([
      supabase
        .from("options")
        .select(OPTION_COLUMNS)
        .in("step_id", safeIds)
        .order("position")
        .returns<Option[]>(),
      supabase
        .from("step_products")
        .select(STEP_PRODUCT_COLUMNS)
        .in("step_id", safeIds)
        .order("position")
        .returns<StepProduct[]>(),
      supabase
        .from("step_fields")
        .select(FIELD_COLUMNS)
        .in("step_id", safeIds)
        .order("position")
        .returns<StepField[]>(),
    ]);

  return {
    journey,
    steps: steps ?? [],
    options: options ?? [],
    products: products ?? [],
    stepProducts: stepProducts ?? [],
    stepFields: stepFields ?? [],
  };
}
