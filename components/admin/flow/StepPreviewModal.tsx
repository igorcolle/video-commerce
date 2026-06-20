"use client";

import type { Step, Option, StepField, Product } from "@/lib/supabase";
import VideoStep from "@/components/player/VideoStep";
import CollectStep from "@/components/player/CollectStep";
import ResultStep from "@/components/player/ResultStep";

// =====================================================================
// StepPreviewModal — pré-visualização de UMA etapa isolada, dentro do
// admin. Reaproveita os componentes reais do player (VideoStep / CollectStep
// / ResultStep) num "celular" simulado, com fundo escurecido. Todos os
// handlers são vazios: nada de eventos, leads ou navegação — é só visual.
// =====================================================================

type Props = {
  step: Step;
  options: Option[];
  fields: StepField[];
  products: Product[]; // produtos vinculados à etapa (na ordem desejada)
  onClose: () => void;
};

const noop = () => {};

export default function StepPreviewModal({
  step,
  options,
  fields,
  products,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      {/* "Celular" simulado: altura cheia (100dvh) para casar com o <main> dos
          componentes do player (que usam h-[100dvh] + fitToHeight) sem cortar.
          Clique dentro não fecha o modal. */}
      <div
        className="relative flex h-[100dvh] w-full max-w-[380px] flex-col overflow-hidden bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar pré-visualização"
          className="absolute right-2 top-2 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"
        >
          ✕
        </button>

        {/* Renderiza o componente real do player conforme o tipo da etapa. */}
        {step.type === "question" && (
          <VideoStep
            step={step}
            options={options}
            products={products}
            onSelect={noop}
          />
        )}
        {step.type === "collect" && (
          <CollectStep step={step} fields={fields} onSubmit={noop} />
        )}
        {step.type === "result" && (
          <ResultStep
            step={step}
            products={products}
            productSpecs={[]}
            journeyName=""
            answers={{}}
            onWhatsapp={noop}
            onBuy={noop}
            onSpecs={noop}
          />
        )}
      </div>
    </div>
  );
}
