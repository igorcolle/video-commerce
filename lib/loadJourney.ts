import { createServerSupabase } from "@/lib/supabase";
import {
  STEP_COLUMNS,
  OPTION_COLUMNS,
  FIELD_COLUMNS,
  PRODUCT_COLUMNS,
  PRODUCT_CATEGORY_COLUMNS,
  PRODUCT_SPEC_COLUMNS,
  PRODUCT_VIDEO_COLUMNS,
  STEP_PRODUCT_COLUMNS,
} from "@/lib/queries";
import type {
  Journey,
  Step,
  Option,
  Product,
  ProductCategory,
  ProductSpec,
  ProductVideo,
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
  productSpecs: ProductSpec[];
  productVideos: ProductVideo[];
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

  // 2) Etapas da jornada.
  const { data: steps } = await supabase
    .from("steps")
    .select(STEP_COLUMNS)
    .eq("journey_id", journey.id)
    .order("position")
    .returns<Step[]>();

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

  // 4) Produtos: agora vêm da BIBLIOTECA (company-scoped), então carregamos
  //    pelos ids vinculados às etapas (step_products), não por journey_id.
  const productIds = Array.from(
    new Set((stepProducts ?? []).map((sp) => sp.product_id))
  );
  const safeProductIds = productIds.length
    ? productIds
    : ["00000000-0000-0000-0000-000000000000"];
  // 5) Produtos + suas especificações e vídeos/destaques + categorias (paralelo).
  const [
    { data: products },
    { data: productSpecs },
    { data: productVideos },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .in("id", safeProductIds)
      .returns<Product[]>(),
    supabase
      .from("product_specs")
      .select(PRODUCT_SPEC_COLUMNS)
      .in("product_id", safeProductIds)
      .order("position")
      .returns<ProductSpec[]>(),
    supabase
      .from("product_videos")
      .select(PRODUCT_VIDEO_COLUMNS)
      .in("product_id", safeProductIds)
      .order("position")
      .returns<ProductVideo[]>(),
    supabase
      .from("product_categories")
      .select(PRODUCT_CATEGORY_COLUMNS)
      .eq("company_id", journey.company_id)
      .returns<ProductCategory[]>(),
  ]);

  // Ordena os produtos pela ORDEM DA BIBLIOTECA: posição da categoria e, dentro
  // dela, posição do produto (mesma ordem definida no admin de Produtos).
  const catPos = new Map<string, number>(
    (categories ?? []).map((c) => [c.id, c.position])
  );
  const orderedProducts = [...(products ?? [])].sort((a, b) => {
    const ca = a.category_id ? catPos.get(a.category_id) ?? 9999 : 9999;
    const cb = b.category_id ? catPos.get(b.category_id) ?? 9999 : 9999;
    if (ca !== cb) return ca - cb;
    return a.position - b.position;
  });

  return {
    journey,
    steps: steps ?? [],
    options: options ?? [],
    products: orderedProducts,
    productSpecs: productSpecs ?? [],
    productVideos: productVideos ?? [],
    stepProducts: stepProducts ?? [],
    stepFields: stepFields ?? [],
  };
}
