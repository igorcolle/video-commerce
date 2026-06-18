"use client";

// =====================================================================
// ProductPhotoUpload — envia a FOTO do produto por upload (no lugar de
// digitar a URL). Sobe o arquivo para o bucket "images" do Storage e guarda
// a URL pública num <input type="hidden" name="photo_url">, para que o
// formulário/server action de produto (updateProduct) continue igual.
// Reaproveita o mesmo padrão de upload do EmojiPicker.
// =====================================================================

import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase-browser";

type Props = {
  journeyId: string;
  productId: string;
  initialUrl: string | null;
};

export default function ProductPhotoUpload({
  journeyId,
  productId,
  initialUrl,
}: Props) {
  const [url, setUrl] = useState<string>(initialUrl ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setEnviando(true);
    try {
      const supabase = createBrowserAuthClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${journeyId}/products/${productId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setErro("Falha no upload: " + upErr.message);
        return;
      }
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch {
      setErro("Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="ds-label">Foto</span>

      {/* Guarda a URL para o server action (updateProduct) — sem alteração lá. */}
      <input type="hidden" name="photo_url" value={url} />

      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Foto do produto"
            className="h-14 w-14 rounded-md object-cover ring-1 ring-[var(--border)]"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--text-subtle)] ring-1 ring-[var(--border)]">
            <span className="text-lg">🖼️</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label
            className={`w-fit cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)] ${
              enviando ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {enviando ? "Enviando..." : url ? "Trocar foto" : "Enviar foto"}
            <input
              type="file"
              accept="image/*"
              onChange={aoEscolherFoto}
              disabled={enviando}
              className="hidden"
            />
          </label>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="self-start text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
            >
              Remover foto
            </button>
          )}
        </div>
      </div>

      {erro && <p className="text-xs text-[var(--danger)]">{erro}</p>}
    </div>
  );
}
