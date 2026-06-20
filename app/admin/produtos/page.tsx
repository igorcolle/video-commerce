import { ensureProfile } from "@/lib/admin";
import { createServerAuthClient } from "@/lib/supabase-server";
import {
  PRODUCT_CATEGORY_COLUMNS,
  PRODUCT_COLUMNS,
  PRODUCT_SPEC_COLUMNS,
  PRODUCT_VIDEO_COLUMNS,
} from "@/lib/queries";
import type {
  Product,
  ProductCategory,
  ProductSpec,
  ProductVideo,
} from "@/lib/supabase";
import ProductsClient from "@/components/admin/produtos/ProductsClient";

// Produto enriquecido com suas specs e vídeos (para abrir no modal).
export type FullProduct = Product & {
  specs: ProductSpec[];
  videos: ProductVideo[];
};

export const dynamic = "force-dynamic";

// Página da BIBLIOTECA DE PRODUTOS da empresa (reutilizável em jornadas).
export default async function ProdutosPage() {
  const companyId = await ensureProfile();
  const supabase = await createServerAuthClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("product_categories")
      .select(PRODUCT_CATEGORY_COLUMNS)
      .eq("company_id", companyId)
      .order("position")
      .returns<ProductCategory[]>(),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("company_id", companyId)
      .order("position")
      .order("created_at")
      .returns<Product[]>(),
  ]);

  const productIds = (products ?? []).map((p) => p.id);

  // Specs e vídeos de todos os produtos, para abrir direto no modal.
  const [{ data: specs }, { data: videos }] =
    productIds.length > 0
      ? await Promise.all([
          supabase
            .from("product_specs")
            .select(PRODUCT_SPEC_COLUMNS)
            .in("product_id", productIds)
            .order("position")
            .returns<ProductSpec[]>(),
          supabase
            .from("product_videos")
            .select(PRODUCT_VIDEO_COLUMNS)
            .in("product_id", productIds)
            .order("position")
            .returns<ProductVideo[]>(),
        ])
      : [{ data: [] as ProductSpec[] }, { data: [] as ProductVideo[] }];

  const fullProducts: FullProduct[] = (products ?? []).map((p) => ({
    ...p,
    specs: (specs ?? []).filter((s) => s.product_id === p.id),
    videos: (videos ?? []).filter((v) => v.product_id === p.id),
  }));

  return (
    <ProductsClient
      categories={categories ?? []}
      products={fullProducts}
    />
  );
}
