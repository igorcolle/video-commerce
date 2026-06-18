"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// =====================================================================
// StoryVideo — player no formato stories (vertical 9:16) com controles
// próprios no canto superior direito: volume, compartilhar, velocidade
// (1x / 1,5x / 2x) e reiniciar (só habilita quando o vídeo termina).
// Barra de progresso fina no topo e "tocar para pausar" (padrão stories).
//
// `children` é a camada de overlay (ex.: pergunta + botões de decisão).
// Ela deve usar pointer-events-none no container e pointer-events-auto nos
// botões: assim os toques em áreas livres pausam/retomam o vídeo.
// =====================================================================

// Estado de reprodução exposto ao overlay (usado para revelar os botões).
export type PlaybackState = { remaining: number; ended: boolean };

type Props = {
  src: string;
  onEnded?: () => void;
  // Quando fornecido, mostra um botão de fechar (X) no topo dos controles.
  onClose?: () => void;
  // Avisa (uma vez) quando o vídeo atual já bufferizou o suficiente para tocar
  // sem travar — usado para só então pré-carregar os próximos vídeos.
  onReady?: () => void;
  // Estado de áudio "elevado" ao Player: uma vez que o visitante ativa o som,
  // os próximos vídeos já começam com som.
  audioOn?: boolean;
  onAudioChange?: (on: boolean) => void;
  // children pode ser um nó simples ou uma função que recebe o estado de
  // reprodução (tempo restante + se terminou), para o overlay reagir.
  children?: ReactNode | ((s: PlaybackState) => ReactNode);
};

// Sequência de velocidades do botão de velocidade.
const SPEEDS = [1, 1.5, 2] as const;

export default function StoryVideo({
  src,
  onEnded,
  onClose,
  onReady,
  audioOn = false,
  onAudioChange,
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readyRef = useRef(false); // garante que onReady dispare só uma vez
  // Se o visitante já ativou o som antes, este vídeo já começa com som.
  const [muted, setMuted] = useState(!audioOn);
  const [progress, setProgress] = useState(0); // 0–100
  const [remaining, setRemaining] = useState(Infinity); // segundos até o fim
  const [ended, setEnded] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  // Aviso em destaque para ativar o som (o vídeo começa mudo por padrão).
  const [showSoundHint, setShowSoundHint] = useState(true);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    onAudioChange?.(!v.muted); // eleva o estado de áudio ao Player
    if (!v.muted) setShowSoundHint(false); // ativou o som → some o aviso
  }

  // Ativa o som direto pelo aviso em destaque (e oculta o aviso).
  function enableSound() {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      setMuted(false);
    }
    onAudioChange?.(true); // eleva o estado de áudio ao Player
    setShowSoundHint(false);
  }

  // Se o visitante já ativou o som em um vídeo anterior, tenta começar este
  // com som. Se o navegador bloquear o autoplay com áudio, cai para mudo.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !audioOn) return;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (videoRef.current) videoRef.current.playbackRate = SPEEDS[next];
  }

  function restart() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play().catch(() => {});
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
    } catch {
      // usuário cancelou o compartilhamento nativo — segue para o fallback
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignora se o navegador bloquear a área de transferência */
    }
  }

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-xl bg-black">
      {src && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          autoPlay
          muted={muted}
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) {
              setProgress((v.currentTime / v.duration) * 100);
              setRemaining(Math.max(0, v.duration - v.currentTime));
            }
          }}
          onEnded={() => {
            setEnded(true);
            setRemaining(0);
            onEnded?.();
          }}
          onCanPlayThrough={() => {
            // Vídeo atual já tem buffer suficiente: libera o pré-carregamento.
            if (!readyRef.current) {
              readyRef.current = true;
              onReady?.();
            }
          }}
          onPlay={() => setEnded(false)}
        />
      )}

      {/* Barra de progresso fina no topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1 bg-white/25">
        <div className="h-full bg-white" style={{ width: `${progress}%` }} />
      </div>

      {/* Camada para tocar e pausar/retomar (fica abaixo do overlay) */}
      <button
        type="button"
        aria-label="Pausar ou continuar"
        onClick={togglePlay}
        className="absolute inset-0 z-10 cursor-default"
      />

      {/* Overlay (pergunta + botões), passado por quem usa o player */}
      {typeof children === "function"
        ? children({ remaining, ended })
        : children}

      {/* Aviso em destaque "ative o som" (à esquerda do botão de volume) */}
      {showSoundHint && muted && (
        <button
          type="button"
          onClick={enableSound}
          className="sound-pill-glow absolute right-14 top-4 z-30 flex h-9 max-w-[60%] items-center gap-1.5 rounded-full bg-green-500 px-2.5 text-[11px] font-bold text-white shadow-lg sm:px-3 sm:text-xs"
        >
          <span className="truncate">
            <span className="sm:hidden">Ativar som</span>
            <span className="hidden sm:inline">Clique aqui para ativar o som</span>
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Controles no canto superior direito */}
      <div className="absolute right-3 top-4 z-30 flex flex-col items-center gap-3">
        {/* Fechar (X) — só aparece no widget; fica ACIMA do volume. */}
        {onClose && (
          <ControlButton label="Fechar" onClick={onClose}>
            <IconClose />
          </ControlButton>
        )}

        <ControlButton label={muted ? "Ativar som" : "Desativar som"} onClick={toggleMute}>
          {muted ? <IconMuted /> : <IconVolume />}
        </ControlButton>

        <ControlButton label="Compartilhar" onClick={share}>
          <IconShare />
        </ControlButton>

        <ControlButton label="Velocidade" onClick={cycleSpeed}>
          <span className="text-[11px] font-bold leading-none">
            {formatSpeed(SPEEDS[speedIdx])}
          </span>
        </ControlButton>

        {/* Reiniciar fica SEMPRE ativo: o cliente pode recomeçar quando quiser. */}
        <ControlButton label="Reiniciar" onClick={restart}>
          <IconRestart />
        </ControlButton>
      </div>

      {/* Aviso "link copiado" (fallback do compartilhar) */}
      {copied && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
          Link copiado!
        </div>
      )}
    </div>
  );
}

// Velocidade exibida no botão (1x / 1,5x / 2x — vírgula no padrão brasileiro).
function formatSpeed(s: number): string {
  return `${String(s).replace(".", ",")}x`;
}

// Botão circular padrão dos controles.
function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// ----- Ícones (SVG inline, sem dependências) -----

function IconVolume() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function IconMuted() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconRestart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </svg>
  );
}
