"use client";

import { useEffect, useRef, useState } from "react";
import { getSessionId } from "@/lib/session";
import { onlyDigits } from "@/lib/mask";
import type {
  Journey,
  Step,
  Option,
  Product,
  StepProduct,
  StepField,
  EventType,
} from "@/lib/supabase";
import VideoStep from "./VideoStep";
import CollectStep from "./CollectStep";
import ResultStep from "./ResultStep";

// Dados de contato coletados num formulário de "coleta de dados".
type Contact = { name?: string; email?: string; whatsapp?: string };

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
  stepFields: StepField[];
  // Quando true, mostra o botão de fechar (X) que recolhe o widget no site host.
  embed?: boolean;
};

export default function Player({
  journey,
  steps,
  options,
  products,
  stepProducts,
  stepFields,
  embed = false,
}: Props) {
  const [currentStepId, setCurrentStepId] = useState<string | null>(
    journey.start_step_id
  );
  // Respostas acumuladas: { "Uso": "Chácara", "Área": "..." }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Dados de contato coletados em etapas de "coleta de dados".
  const [contact, setContact] = useState<Contact>({});
  // Pilha de etapas visitadas (para o botão "voltar" do player).
  const [history, setHistory] = useState<string[]>([]);
  // Id da etapa cujo vídeo já bufferizou: só então pré-carregamos os próximos
  // (para não roubar banda do vídeo que está tocando e causar travadas).
  const [readyStepId, setReadyStepId] = useState<string | null>(null);
  // Áudio persistente: ativado pelo visitante uma vez, vale para todos os
  // vídeos seguintes da jornada.
  const [audioOn, setAudioOn] = useState(false);

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

  // Grava/atualiza o lead (1 por sessão — a API faz upsert por session_id).
  // É chamado tanto ao enviar um formulário de coleta quanto ao chegar no
  // resultado, sempre com o estado mais completo de respostas/contato.
  function saveLead(opts: {
    answers: Record<string, string>;
    contact: Contact;
    recommended_products?: string[];
  }) {
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journey_id: journey.id,
        session_id: sessionRef.current || getSessionId(),
        answers: opts.answers,
        recommended_products: opts.recommended_products ?? [],
        name: opts.contact.name ?? null,
        email: opts.contact.email ?? null,
        whatsapp: opts.contact.whatsapp ?? null,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  // Cria o lead ao chegar no resultado (com os produtos recomendados).
  function createLead(resultStepId: string) {
    saveLead({
      answers,
      contact,
      recommended_products: recommendedNames(resultStepId),
    });
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

  // Envio do formulário de uma etapa de "coleta de dados".
  function handleCollect(
    step: Step,
    fields: StepField[],
    values: Record<string, string>
  ) {
    const nextAnswers = { ...answers };
    const nextContact: Contact = { ...contact };
    for (const f of fields) {
      const v = (values[f.id] ?? "").trim();
      if (!v) continue;
      nextAnswers[f.label] = v;
      if (f.kind === "full_name") nextContact.name = v;
      else if (f.kind === "email") nextContact.email = v;
      else if (f.kind === "whatsapp") nextContact.whatsapp = onlyDigits(v);
    }
    setAnswers(nextAnswers);
    setContact(nextContact);
    // Salva o lead já no envio (não espera o final da jornada).
    saveLead({ answers: nextAnswers, contact: nextContact });
    setHistory((h) => [...h, step.id]);
    setCurrentStepId(step.next_step_id ?? null);
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

  if (currentStep.type === "collect") {
    const fields = stepFields
      .filter((f) => f.step_id === currentStep.id)
      .sort((a, b) => a.position - b.position);
    return (
      <CollectStep
        key={currentStep.id}
        step={currentStep}
        fields={fields}
        onSubmit={(values) => handleCollect(currentStep, fields, values)}
        onClose={handleClose}
        onBack={history.length ? goBack : undefined}
        onReady={() => setReadyStepId(currentStep.id)}
        audioOn={audioOn}
        onAudioChange={setAudioOn}
      />
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

  // Produtos vinculados a esta etapa de pergunta (alimentam o carrinho).
  const stepCartProducts = stepProducts
    .filter((sp) => sp.step_id === currentStep.id)
    .sort((a, b) => a.position - b.position)
    .map((sp) => products.find((p) => p.id === sp.product_id))
    .filter((p): p is Product => Boolean(p));

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
        audioOn={audioOn}
        onAudioChange={setAudioOn}
        products={stepCartProducts}
        journeyName={journey.name}
        answers={answers}
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
