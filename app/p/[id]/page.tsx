import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import {
  PRODUCT_COLUMNS,
  PRODUCT_SPEC_COLUMNS,
  PRODUCT_VIDEO_COLUMNS,
} from "@/lib/queries";
import type { Product, ProductSpec, ProductVideo } from "@/lib/supabase";
import ProductPlayer from "@/components/player/ProductPlayer";

export const dynamic = "force-dynamic";

// =====================================================================
// Player público de UM produto: /p/<id>
//
// Server Component: carrega o produto, seus vídeos e especificações pela
// chave service_role (assim qualquer produto é acessível pelo link, sem
// depender de RLS/jornada) e entrega ao <ProductPlayer/> (client).
// =====================================================================
export default async function ProductPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: product } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .single<Product>();

  if (!product) notFound();

  const [{ data: videos }, { data: specs }] = await Promise.all([
    supabase
      .from("product_videos")
      .select(PRODUCT_VIDEO_COLUMNS)
      .eq("product_id", id)
      .order("position")
      .returns<ProductVideo[]>(),
    supabase
      .from("product_specs")
      .select(PRODUCT_SPEC_COLUMNS)
      .eq("product_id", id)
      .order("position")
      .returns<ProductSpec[]>(),
  ]);

  // Vídeo principal (is_main) ou, na falta, o primeiro por posição.
  const list = videos ?? [];
  const videoUrl =
    list.find((v) => v.is_main)?.video_url ?? list[0]?.video_url ?? null;

  // Vídeos de destaque (bolinhas) do produto, na ordem (position).
  const highlights = list.filter((v) => v.is_highlight);

  return (
    <ProductPlayer
      product={product}
      specs={specs ?? []}
      videoUrl={videoUrl}
      highlights={highlights}
    />
  );
}
