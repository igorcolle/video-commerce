"use client";

import { useState } from "react";
import type { Step, Option } from "@/lib/supabase";
import {
  optionButtonVisual,
  optionsContainerClass,
  resolveButtonStyle,
  fontFamilyOf,
  questionPositionClass,
  questionFontSizeClass,
  questionBoxStyle,
  buttonTextSizeClass,
} from "@/lib/buttonStyle";
import OptionIcon from "@/components/ui/OptionIcon";
import StoryVideo from "./StoryVideo";

// =====================================================================
// VideoStep — etapa de pergunta. O vídeo (formato stories 9:16) tem
// controles próprios e, SOBRE ele, ficam a pergunta e os botões de
// decisão. A camada de overlay é "pointer-events-none" e só os botões
// captam clique, então tocar nas áreas livres pausa/retoma o vídeo.
//
// Pergunta e botões aparecem JUNTOS, com uma animação sequencial suave.
// Podem começar MINIMIZADOS (mostrando uma setinha) e expandir quando
// faltar X segundos para o vídeo terminar — ou ao toque na seta. O cliente
// também pode minimizar manualmente a qualquer momento para ver o vídeo.
// =====================================================================

type Props = {
  step: Step;
  options: Option[];
  onSelect: (opt: Option) => void;
  onClose?: () => void;
  // Volta ao vídeo/pergunta anterior (ausente na primeira etapa).
  onBack?: () => void;
  // Avisa quando o vídeo atual já está pronto (buffer suficiente).
  onReady?: () => void;
};

export default function VideoStep({
  step,
  options,
  onSelect,
  onClose,
  onBack,
  onReady,
}: Props) {
  const s = resolveButtonStyle(step);
  const visual = optionButtonVisual(step);
  const questionFont = fontFamilyOf(s.font);
  const btnText = buttonTextSizeClass(s.buttonTextSize);

  // Expansão manual (tocar na setinha) e minimização manual (tocar no botão
  // de minimizar). Resetam ao trocar de etapa via key={step.id} no Player.
  const [manualExpanded, setManualExpanded] = useState(false);
  const [userMinimized, setUserMinimized] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-4 sm:p-8">
      <StoryVideo src={step.video_url ?? ""} onClose={onClose} onReady={onReady}>
        {({ remaining, ended }) => {
          // Botões disponíveis: sempre (se revelação desligada) ou quando faltar
          // X segundos / terminar / o cliente tocar na setinha.
          const buttonsReady =
            !s.revealEnabled ||
            ended ||
            manualExpanded ||
            remaining <= s.revealSeconds;

          // Overlay (pergunta + botões) visível = pronto E não minimizado.
          const overlayVisible = buttonsReady && !userMinimized;

          return (
            <>
              {/* Gradiente para legibilidade da pergunta/botões */}
              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

              {/* Botão minimalista de voltar (centro-esquerda) */}
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Voltar ao vídeo anterior"
                  className="pointer-events-auto absolute left-3 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}

              {/* Camada de overlay (pergunta posicionável + botões embaixo) */}
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-4">
                {/* Zona da pergunta (topo/meio/base) */}
                <div className={questionPositionClass(s.questionPosition)}>
                  <div className="flex w-full flex-col items-center">
                    {/* Botão de minimizar pergunta + botões (acima da pergunta) */}
                    {overlayVisible && (
                      <div className="mb-1 flex w-full justify-end">
                        <button
                          type="button"
                          onClick={() => setUserMinimized(true)}
                          aria-label="Minimizar pergunta e botões"
                          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {overlayVisible && step.question_text && (
                      <h2
                        style={{
                          ...questionBoxStyle(
                            s.questionBgEnabled,
                            s.questionBgColor,
                            s.questionFontColor
                          ),
                          fontFamily: questionFont,
                          animation: "fadeInUp .35s ease both",
                        }}
                        className={`rounded-lg px-4 py-2 text-center font-bold ${questionFontSizeClass(
                          s.questionFontSize
                        )} ${s.questionBgEnabled ? "backdrop-blur-sm" : ""}`}
                      >
                        {step.question_text}
                      </h2>
                    )}
                  </div>
                </div>

                {/* Zona dos botões (sempre na base) */}
                <div>
                  {overlayVisible ? (
                    <>
                      <div className={`${optionsContainerClass(s.layout)} gap-2.5`}>
                        {options.map((opt, i) => (
                          <button
                            key={opt.id}
                            onClick={() => onSelect(opt)}
                            className={`pointer-events-auto ${visual.className}`}
                            style={{
                              ...visual.style,
                              // Animação sequencial: cada botão surge logo após
                              // a pergunta, em cascata harmônica. Quando o vídeo
                              // termina, ganham um pulso leve contínuo que
                              // estimula o clique.
                              animation: ended
                                ? `fadeInUp .35s ease both, attentionPulse 1.6s ease-in-out ${
                                    0.5 + i * 0.08
                                  }s infinite`
                                : "fadeInUp .35s ease both",
                              animationDelay: ended
                                ? undefined
                                : `${0.1 + i * 0.08}s`,
                            }}
                          >
                            <span className="flex items-center gap-3">
                              {opt.icon && (
                                <OptionIcon
                                  value={opt.icon}
                                  size={26}
                                  className="shrink-0 text-2xl leading-none"
                                />
                              )}
                              <span className="min-w-0">
                                <span
                                  className={`block truncate font-bold leading-tight ${btnText.label}`}
                                >
                                  {opt.label}
                                </span>
                                {opt.subtitle && (
                                  <span
                                    className={`block truncate leading-tight opacity-80 ${btnText.subtitle}`}
                                  >
                                    {opt.subtitle}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    // Setinha indicando que pergunta + botões estão minimizados.
                    <button
                      type="button"
                      onClick={() => {
                        setManualExpanded(true);
                        setUserMinimized(false);
                      }}
                      aria-label="Mostrar pergunta e opções"
                      className="pointer-events-auto mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
                    >
                      <svg
                        className="animate-bounce"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </>
          );
        }}
      </StoryVideo>
    </main>
  );
}
