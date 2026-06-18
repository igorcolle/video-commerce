"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserAuthClient } from "@/lib/supabase-browser";
import { setStepVideo } from "@/app/admin/jornadas/[id]/actions";
import { setStepVideoQuiet } from "@/app/admin/jornadas/[id]/flow-actions";
import { buttonClasses } from "@/components/ui/Button";
import { compressVideo } from "@/lib/compressVideo";

// Upload de vídeo para o bucket "videos" do Supabase Storage.
// Após subir, salva a URL pública na etapa (steps.video_url).
//
// Modo padrão: salva e recarrega a página (router.refresh).
// Modo "silencioso" (quando recebe onUploaded): salva sem recarregar e
// avisa o pai — usado no flow builder para não remontar o canvas.
type Props = {
  stepId: string;
  journeyId: string;
  currentUrl: string | null;
  onUploaded?: (url: string) => void;
};

export default function VideoUpload({
  stepId,
  journeyId,
  currentUrl,
  onUploaded,
}: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro(null);
    setEnviando(true);

    try {
      const supabase = createBrowserAuthClient();

      // 1) Comprime o vídeo no navegador (mantém 1080x1920, fica bem menor e
      //    carrega rápido). Se a compressão falhar, envia o arquivo original.
      let toUpload: Blob = file;
      let ext = file.name.split(".").pop() || "mp4";
      let contentType = file.type || "video/mp4";
      try {
        setProgresso("Otimizando vídeo... 0%");
        const comprimido = await compressVideo(file, (pct) =>
          setProgresso(`Otimizando vídeo... ${pct}%`)
        );
        toUpload = comprimido;
        ext = "mp4";
        contentType = "video/mp4";
      } catch {
        // Não trava o envio: segue com o arquivo original.
        toUpload = file;
      }

      // 2) Envia ao Storage.
      setProgresso("Enviando vídeo...");
      const path = `${journeyId}/${stepId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("videos")
        .upload(path, toUpload, { upsert: true, contentType });

      if (upErr) {
        setErro("Falha no upload: " + upErr.message);
        setEnviando(false);
        setProgresso(null);
        return;
      }

      const { data } = supabase.storage.from("videos").getPublicUrl(path);

      if (onUploaded) {
        // Modo silencioso (flow builder): salva sem recarregar a página.
        await setStepVideoQuiet(stepId, data.publicUrl);
        onUploaded(data.publicUrl);
      } else {
        await setStepVideo(stepId, journeyId, data.publicUrl);
        router.refresh();
      }

      setProgresso("Vídeo salvo!");
    } catch {
      setErro("Não foi possível enviar o vídeo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {currentUrl ? (
        <video
          src={currentUrl}
          controls
          className="aspect-video w-full rounded-lg bg-black"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-subtle)]">
          Sem vídeo
        </div>
      )}

      <label className={`${buttonClasses("secondary", "sm")} w-fit cursor-pointer`}>
        {enviando ? "Enviando..." : currentUrl ? "Trocar vídeo" : "Enviar vídeo"}
        <input
          type="file"
          accept="video/*"
          onChange={aoEscolherArquivo}
          disabled={enviando}
          className="hidden"
        />
      </label>

      {progresso && (
        <p className="text-xs text-[var(--text-subtle)]">{progresso}</p>
      )}
      {erro && <p className="text-xs text-[var(--danger)]">{erro}</p>}
    </div>
  );
}
