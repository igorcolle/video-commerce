"use client";

import { useEffect, useRef, useState } from "react";
import { getSessionId } from "@/lib/session";
import type {
  Journey,
  Step,
  Option,
  Product,
  StepProduct,
  EventType,
} from "@/lib/supabase";
import VideoStep from "./VideoStep";
import ResultStep from "./ResultStep";

// =====================================================================
// Player — o coração da experiência.
// Controla em qual etapa o cliente está, guarda as respostas e dispara
// os eventos. A RAMIFICAÇÃO acontece ao seguir option.next_step_id.
// =====================================================================

type Props = {
  journey: Journey;
  steps: Step[];
  options: Option[];
  products: Product[];
  stepProducts: StepProduct[];
  // Quando true, mostra o botão de fechar (X) que recolhe o widget no site host.
  embed?: boolean;
};

export default function Player({
  journey,
  steps,
  options,
  products,
  stepProducts,
  embed = false,
}: Props) {
  const [currentStepId, setCurrentStepId] = useState<string | null>(
    journey.start_step_id
  );
  // Respostas acumuladas: { "Uso": "Chácara", "Área": "..." }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Pilha de etapas visitadas (para o botão "voltar" do player).
  const [history, setHistory] = useState<string[]>([]);
  // Id da etapa cujo vídeo já bufferizou: só então pré-carregamos os próximos
  // (para não roubar banda do vídeo que está tocando e causar travadas).
  const [readyStepId, setReadyStepId] = useState<string | null>(null);

  const sessionRef = useRef<string>("");
  const completedRef = useRef(false); // evita registrar "complete" duas vezes

  const currentStep = steps.find((s) => s.id === currentStepId) ?? null;

  // Envia um evento para a API (sem travar a interface se falhar).
  function sendEvent(
    event_type: EventType,
    extra: { step_id?: string | null; option_id?: string | null; metadata?: unknown } = {}
  ) {
    const session_id = sessionRef.current || getSessionId();
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journey_id: journey.id,
        session_id,
        event_type,
        ...extra,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  // Nomes dos produtos recomendados numa etapa de resultado.
  function recommendedNames(stepId: string): string[] {
    return stepProducts
      .filter((sp) => sp.step_id === stepId)
      .sort((a, b) => a.position - b.position)
      .map((sp) => products.find((p) => p.id === sp.product_id)?.name)
      .filter((n): n is string => Boolean(n));
  }

  // Cria o lead (chamado ao chegar no resultado).
  function createLead(resultStepId: string) {
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journey_id: journey.id,
        session_id: sessionRef.current || getSessionId(),
        answers,
        recommended_products: recommendedNames(resultStepId),
      }),
      keepalive: true,
    }).catch(() => {});
  }

  // Ao montar: gera o session_id e registra o início.
  useEffect(() => {
    sessionRef.current = getSessionId();
    sendEvent("start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A cada troca de etapa: registra view_step. Se for resultado, completa.
  useEffect(() => {
    if (!currentStepId) return;
    sendEvent("view_step", { step_id: currentStepId });

    const step = steps.find((s) => s.id === currentStepId);
    if (step?.type === "result" && !completedRef.current) {
      completedRef.current = true;
      sendEvent("complete", { step_id: currentStepId });
      createLead(currentStepId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]);

  // No modo embed, fechar = avisar o site hospedeiro para recolher o widget.
  const handleClose = embed
    ? () => {
        try {
          window.parent.postMessage({ type: "vc-widget-close" }, "*");
        } catch {
          /* iframe sem parent acessível — ignora */
        }
      }
    : undefined;

  // Clique num botão de decisão: registra, guarda a resposta e ramifica.
  function handleOption(step: Step, opt: Option) {
    sendEvent("click_option", { step_id: step.id, option_id: opt.id });
    const chave = step.title || step.question_text || "Pergunta";
    setAnswers((prev) => ({ ...prev, [chave]: opt.label }));
    setHistory((h) => [...h, step.id]); // guarda de onde viemos
    setCurrentStepId(opt.next_step_id);
  }

  // Voltar ao vídeo anterior e refazer a pergunta anterior.
  function goBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    const prevStep = steps.find((s) => s.id === prev);
    // Remove a resposta que havia sido dada naquela etapa (para responder de novo).
    if (prevStep) {
      const chave = prevStep.title || prevStep.question_text || "Pergunta";
      setAnswers((prev) => {
        const copy = { ...prev };
        delete copy[chave];
        return copy;
      });
    }
    setHistory((h) => h.slice(0, -1));
    setCurrentStepId(prev);
  }

  // ----- Renderização -----

  if (!currentStep) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-center text-gray-600">
        Jornada concluída. Obrigado!
      </main>
    );
  }

  if (currentStep.type === "result") {
    const resultProducts = stepProducts
      .filter((sp) => sp.step_id === currentStep.id)
      .sort((a, b) => a.position - b.position)
      .map((sp) => products.find((p) => p.id === sp.product_id))
      .filter((p): p is Product => Boolean(p));

    return (
      <ResultStep
        step={currentStep}
        products={resultProducts}
        journeyName={journey.name}
        answers={answers}
        onClose={handleClose}
        onWhatsapp={(productId) =>
          sendEvent("click_whatsapp", {
            step_id: currentStep.id,
            metadata: { product_id: productId ?? null },
          })
        }
        onBuy={(productId) =>
          sendEvent("click_buy", {
            step_id: currentStep.id,
            metadata: { product_id: productId },
          })
        }
      />
    );
  }

  // Etapa de pergunta.
  const stepOptions = options
    .filter((o) => o.step_id === currentStep.id)
    .sort((a, b) => a.position - b.position);

  // Pré-carrega os vídeos das PRÓXIMAS etapas (destinos dos botões), mas só
  // DEPOIS que o vídeo atual já bufferizou (readyStepId), para que a troca fique
  // instantânea sem roubar banda de quem está tocando.
  const currentReady = readyStepId === currentStep.id;
  const nextVideoUrls = currentReady
    ? Array.from(
        new Set(
          stepOptions
            .map((o) => steps.find((s) => s.id === o.next_step_id)?.video_url)
            .filter(
              (url): url is string =>
                Boolean(url) && url !== currentStep.video_url
            )
        )
      )
    : [];

  return (
    <>
      <VideoStep
        key={currentStep.id}
        step={currentStep}
        options={stepOptions}
        onSelect={(opt) => handleOption(currentStep, opt)}
        onClose={handleClose}
        onBack={history.length ? goBack : undefined}
        onReady={() => setReadyStepId(currentStep.id)}
      />

      {/* Pré-carregamento dos próximos vídeos. Fica fora da tela (e não
          display:none) para o browser realmente bufferar o arquivo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        style={{ left: -9999, top: -9999 }}
      >
        {nextVideoUrls.map((url) => (
          <video key={url} src={url} muted preload="auto" tabIndex={-1} />
        ))}
      </div>
    </>
  );
}
