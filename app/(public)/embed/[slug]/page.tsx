import { notFound } from "next/navigation";
import { loadJourney } from "@/lib/loadJourney";
import Player from "@/components/player/Player";

// =====================================================================
// Página de EMBED do player: /embed/<slug>
//
// Idêntica a /j/<slug>, mas renderiza o Player em modo "embed": mostra o
// botão de fechar (X), que avisa o site hospedeiro (window.parent) para
// recolher o widget flutuante. É a página carregada dentro do <iframe>
// criado por public/widget.js.
// =====================================================================

export default async function EmbedPage({
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
      embed
    />
  );
}
