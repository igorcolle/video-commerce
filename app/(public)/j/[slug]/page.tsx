import { notFound } from "next/navigation";
import { loadJourney } from "@/lib/loadJourney";
import Player from "@/components/player/Player";

// =====================================================================
// Página pública do player: /j/<slug>
//
// É um Server Component: busca TODA a jornada de uma vez (loadJourney) e
// entrega para o <Player/> (componente client) montar a experiência.
// =====================================================================

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadJourney(slug);
  if (!data) notFound();

  return (
    <Player
      journey={data.journey}
      steps={data.steps}
      options={data.options}
      products={data.products}
      productSpecs={data.productSpecs}
      productVideos={data.productVideos}
      stepProducts={data.stepProducts}
      stepFields={data.stepFields}
    />
  );
}
