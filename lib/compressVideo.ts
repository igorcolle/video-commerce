"use client";

// =====================================================================
// compressVideo — recodifica um vídeo NO NAVEGADOR (ffmpeg.wasm) antes de
// enviar ao Storage. Mantém a proporção (não faz upscale), limita a 1080 de
// largura, usa H.264 (CRF 26 = qualidade visual praticamente idêntica) e
// "+faststart" para o vídeo COMEÇAR a tocar rápido (carregamento progressivo).
//
// Roda só no admin, uma vez por vídeo. O ffmpeg é carregado sob demanda
// (import dinâmico) e o "core" vem da CDN (evita guardar ~25MB no repositório).
// =====================================================================

import type { FFmpeg } from "@ffmpeg/ffmpeg";

// Versão do core compatível com @ffmpeg/ffmpeg 0.12.x (single-thread: não
// exige headers de cross-origin isolation).
const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

// Reaproveita a mesma instância (o core só é baixado/carregado uma vez).
let instance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ff = new FFmpeg();
  await ff.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  instance = ff;
  return ff;
}

// Recebe o arquivo escolhido e devolve um Blob MP4 comprimido.
// onProgress recebe 0–100. Lança erro se algo falhar (o chamador faz fallback).
export async function compressVideo(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await getFFmpeg();

  const handleProgress = ({ progress }: { progress: number }) => {
    if (onProgress) {
      onProgress(Math.min(100, Math.max(0, Math.round(progress * 100))));
    }
  };
  ffmpeg.on("progress", handleProgress);

  const inputName = `input-${Date.now()}.${file.name.split(".").pop() || "mp4"}`;
  const outputName = `output-${Date.now()}.mp4`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-profile:v", "main",
      "-crf", "26",
      // Teto de bitrate: evita picos que travam em conexões mais fracas
      // (streaming suave). O CRF cuida da qualidade; o maxrate limita o pico.
      "-maxrate", "2500k",
      "-bufsize", "5000k",
      // Trava em 30fps (celulares costumam gravar a 60fps = dobro de dados).
      "-r", "30",
      // Keyframe a cada ~2s: ajuda o início rápido e a fluidez do streaming.
      "-g", "60",
      "-pix_fmt", "yuv420p",
      // Limita a largura a 1080 sem aumentar vídeos menores; -2 mantém a altura
      // par preservando a proporção (ex.: 1080x1920 continua 1080x1920).
      "-vf", "scale='min(1080,iw)':-2",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    // data é um Uint8Array; o cast evita o conflito de tipo do BlobPart.
    return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handleProgress);
    // Limpa o sistema de arquivos virtual do ffmpeg.
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      /* ignora */
    }
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      /* ignora */
    }
  }
}
