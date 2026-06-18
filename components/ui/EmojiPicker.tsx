"use client";

// Seletor de ícone do botão de decisão, organizado em ABAS:
//   - "Emojis"  -> uma única aba com todos os emojis
//   - "Ícones"  -> ícones vetoriais (lucide)
//   - "Imagem"  -> upload de uma imagem própria (vira miniatura no botão)
// Mantém a assinatura value/onChange (string | null) usada pelo Inspector:
//   - emoji  -> o próprio caractere
//   - vetor  -> "lucide:<Nome>"
//   - imagem -> a URL pública da imagem enviada
import { useState } from "react";
import OptionIcon, {
  LUCIDE_NAMES,
  LUCIDE_PREFIX,
  isImageIcon,
} from "./OptionIcon";
import { createBrowserAuthClient } from "@/lib/supabase-browser";

type Props = {
  value: string | null | undefined;
  onChange: (icon: string | null) => void;
  // Necessários para o upload de imagem (montam o caminho no Storage).
  journeyId?: string;
  optionId?: string;
};

// Todos os emojis numa lista só (sem categorias).
const ALL_EMOJIS: string[] = [
  // Decisão / aprovação
  "✅", "❌", "⭐", "❤️", "👍", "👎", "🙂", "🎯", "🏆", "✨",
  "🔔", "🎁", "❓", "ℹ️", "⚠️", "💬", "📞", "🕐",
  // Dinheiro / compra
  "💰", "🛒", "📦", "🚀", "📈", "💳", "🏷️", "🤝",
  // Casa / campo
  "🏠", "🏡", "🏢", "🏭", "🏞️", "⛰️", "🌳", "🌲", "🌾", "🌱", "🚜", "🧑‍🌾",
  // Ferramentas
  "🛠️", "🔧", "🔨", "⚙️", "💪", "👷", "🔩", "🪛", "🧰", "⛏️",
  // Natureza / clima
  "💧", "🔥", "⚡", "☀️", "🌧️", "❄️", "🍃", "🌍", "🌊", "🌬️",
  // Setas / símbolos
  "➡️", "⬅️", "⬆️", "⬇️", "➕", "➖", "🔄", "🔁",
  // Variados úteis
  "📱", "💻", "📷", "🎬", "🎵", "🍽️", "☕", "🐶", "🐱", "🚗", "✈️", "🛡️",
];

type Tab = "emojis" | "icones" | "imagem";

export function EmojiPicker({ value, onChange, journeyId, optionId }: Props) {
  // Aba inicial: depende do tipo do valor atual.
  const initialTab: Tab = isImageIcon(value)
    ? "imagem"
    : value && value.startsWith(LUCIDE_PREFIX)
    ? "icones"
    : "emojis";
  const [tab, setTab] = useState<Tab>(initialTab);

  // Estado do upload de imagem.
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEscolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setEnviando(true);
    try {
      const supabase = createBrowserAuthClient();
      const ext = file.name.split(".").pop() || "png";
      const prefix = journeyId ? `${journeyId}/icons` : "icons";
      const path = `${prefix}/${optionId ?? "btn"}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setErro("Falha no upload: " + upErr.message);
        return;
      }
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setErro("Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Abas */}
      <div className="flex flex-wrap gap-1">
        <TabButton active={tab === "emojis"} onClick={() => setTab("emojis")}>
          Emojis
        </TabButton>
        <TabButton active={tab === "icones"} onClick={() => setTab("icones")}>
          Ícones
        </TabButton>
        <TabButton active={tab === "imagem"} onClick={() => setTab("imagem")}>
          Imagem
        </TabButton>
      </div>

      {/* Conteúdo da aba ativa */}
      {tab === "emojis" && (
        <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {ALL_EMOJIS.map((e, i) => {
            const selected = value === e;
            return (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => onChange(e)}
                aria-label={`Emoji ${e}`}
                className={`flex h-7 w-7 items-center justify-center rounded text-lg transition-colors hover:bg-[var(--surface)] ${
                  selected ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" : ""
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      )}

      {tab === "icones" && (
        <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {LUCIDE_NAMES.map((name) => {
            const iconValue = `${LUCIDE_PREFIX}${name}`;
            const selected = value === iconValue;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(iconValue)}
                aria-label={`Ícone ${name}`}
                title={name}
                className={`flex h-7 w-7 items-center justify-center rounded text-[var(--text)] transition-colors hover:bg-[var(--surface)] ${
                  selected ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" : ""
                }`}
              >
                <OptionIcon value={iconValue} size={18} />
              </button>
            );
          })}
        </div>
      )}

      {tab === "imagem" && (
        <div className="flex flex-col gap-2">
          {isImageIcon(value) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value as string}
              alt="Imagem do botão"
              className="h-14 w-14 rounded-md object-cover ring-1 ring-[var(--border)]"
            />
          )}
          <label
            className={`w-fit cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)] ${
              enviando ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {enviando
              ? "Enviando..."
              : isImageIcon(value)
              ? "Trocar imagem"
              : "Enviar imagem"}
            <input
              type="file"
              accept="image/*"
              onChange={aoEscolherImagem}
              disabled={enviando}
              className="hidden"
            />
          </label>
          <p className="text-[11px] text-[var(--text-subtle)]">
            A imagem aparece como miniatura quadrada (cantos arredondados) no
            botão.
          </p>
          {erro && <p className="text-xs text-[var(--danger)]">{erro}</p>}
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="self-start text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
        >
          Remover ícone
        </button>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
