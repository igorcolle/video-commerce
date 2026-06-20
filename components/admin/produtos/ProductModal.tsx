"use client";

import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase-browser";
import { compressVideo } from "@/lib/compressVideo";
import type { ProductCategory } from "@/lib/supabase";
import type { FullProduct } from "@/app/admin/produtos/page";
import {
  saveProductData,
  saveProductSpecs,
  saveProductVideos,
} from "@/app/admin/produtos/actions";

type Tab = "dados" | "specs" | "videos";

type VideoRow = {
  title: string;
  video_url: string;
  thumb_url: string;
  is_main: boolean;
  is_highlight: boolean;
};

type Props = {
  product: FullProduct;
  categories: ProductCategory[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [tab, setTab] = useState<Tab>("dados");
  const [saving, setSaving] = useState(false);

  // ----- Aba "Dados do produto"
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [tag, setTag] = useState(product.tag ?? "");
  const [tagColor, setTagColor] = useState(product.tag_color ?? "#4be277");
  const [buyLink, setBuyLink] = useState(product.buy_link ?? "");
  const [summary, setSummary] = useState(product.summary ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [photoUrl, setPhotoUrl] = useState(product.photo_url ?? "");
  const [status, setStatus] = useState(product.status ?? "draft");
  const [photoBusy, setPhotoBusy] = useState(false);

  // ----- Aba "Especificações"
  const [specsEnabled, setSpecsEnabled] = useState(product.specs_enabled);
  const [specsSummary, setSpecsSummary] = useState(product.specs_summary ?? "");
  const [specRows, setSpecRows] = useState<{ attribute: string; value: string }[]>(
    product.specs.length > 0
      ? product.specs.map((s) => ({ attribute: s.attribute, value: s.value ?? "" }))
      : [{ attribute: "", value: "" }]
  );

  // ----- Aba "Vídeos"
  const [videos, setVideos] = useState<VideoRow[]>(
    product.videos.map((v) => ({
      title: v.title ?? "",
      video_url: v.video_url,
      thumb_url: v.thumb_url ?? "",
      is_main: v.is_main,
      is_highlight: v.is_highlight,
    }))
  );
  const [videoBusy, setVideoBusy] = useState<string | null>(null);
  // Segundos antes do fim do vídeo principal para a barra de destaques aparecer
  // (0 = aparece desde o início).
  const [highlightsRevealSeconds, setHighlightsRevealSeconds] = useState(
    product.highlights_reveal_seconds ?? 0
  );

  // ---------------------------------------------------------------- UPLOADS

  async function uploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const supabase = createBrowserAuthClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `products/${product.id}/photo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        window.alert("Falha no upload: " + error.message);
        return;
      }
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function uploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoBusy("Enviando vídeo...");
    try {
      const supabase = createBrowserAuthClient();
      let toUpload: Blob = file;
      let ext = file.name.split(".").pop() || "mp4";
      let contentType = file.type || "video/mp4";
      try {
        setVideoBusy("Otimizando vídeo... 0%");
        toUpload = await compressVideo(file, (pct) =>
          setVideoBusy(`Otimizando vídeo... ${pct}%`)
        );
        ext = "mp4";
        contentType = "video/mp4";
      } catch {
        toUpload = file;
      }
      setVideoBusy("Enviando vídeo...");
      const path = `products/${product.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("videos")
        .upload(path, toUpload, { upsert: true, contentType });
      if (error) {
        window.alert("Falha no upload: " + error.message);
        return;
      }
      const { data } = supabase.storage.from("videos").getPublicUrl(path);
      setVideos((prev) => [
        ...prev,
        {
          title: `Vídeo ${prev.length + 1}`,
          video_url: data.publicUrl,
          thumb_url: "",
          is_main: prev.length === 0, // o primeiro vira principal
          is_highlight: true,
        },
      ]);
    } finally {
      setVideoBusy(null);
    }
  }

  // ---------------------------------------------------------------- SALVAR

  async function salvarDados() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", product.id);
      fd.set("name", name);
      fd.set("category_id", categoryId);
      fd.set("tag", tag);
      fd.set("tag_color", tagColor);
      fd.set("buy_link", buyLink);
      fd.set("summary", summary);
      fd.set("description", description);
      fd.set("photo_url", photoUrl);
      fd.set("status", status);
      await saveProductData(fd);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function salvarSpecs() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", product.id);
      fd.set("specs_enabled", specsEnabled ? "true" : "false");
      fd.set("specs_summary", specsSummary);
      fd.set("specs_json", JSON.stringify(specRows));
      await saveProductSpecs(fd);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function salvarVideos() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", product.id);
      fd.set("videos_json", JSON.stringify(videos));
      fd.set("highlights_reveal_seconds", String(highlightsRevealSeconds));
      await saveProductVideos(fd);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-md text-on-surface outline-none transition-colors focus:border-primary";
  const labelCls = "block font-label-md text-label-md text-on-surface-variant";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-lg py-3">
          <div className="flex items-center gap-3">
            <span className="font-label-md font-bold text-primary">
              EDITANDO: {name || "Produto"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-lg border-b border-outline-variant bg-surface-container-low px-lg">
          {([
            ["dados", "Dados do produto"],
            ["specs", "Especificações"],
            ["videos", "Vídeos"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-4 font-label-md text-label-md transition-colors ${
                tab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="custom-scrollbar overflow-y-auto p-lg" style={{ maxHeight: "70vh" }}>
          {tab === "dados" && (
            <div className="grid grid-cols-12 gap-lg">
              <div className="col-span-12 space-y-md lg:col-span-8">
                <div className="grid grid-cols-2 gap-md">
                  <div className="space-y-sm">
                    <label className={labelCls}>Nome do Produto</label>
                    <input
                      className={inputCls}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-sm">
                    <label className={labelCls}>Categoria</label>
                    <select
                      className={`${inputCls} appearance-none`}
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div className="space-y-sm">
                    <label className={labelCls}>Tag</label>
                    <div className="flex items-center gap-2">
                      <input
                        className={`${inputCls} flex-1 font-mono-sm`}
                        placeholder="Ex.: Gasolina"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                      />
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className="h-9 w-9 cursor-pointer rounded-full border-2 border-white bg-transparent"
                        title="Cor da tag"
                      />
                    </div>
                  </div>
                  <div className="space-y-sm">
                    <label className={labelCls}>Link</label>
                    <input
                      className={`${inputCls} font-mono-sm`}
                      placeholder="https://..."
                      value={buyLink}
                      onChange={(e) => setBuyLink(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div className="space-y-sm">
                    <label className={labelCls}>Resumo</label>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={4}
                      placeholder="Resumo rápido..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                  </div>
                  <div className="space-y-sm">
                    <label className={labelCls}>Descrição Ampla</label>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className={labelCls}>Status</label>
                  <select
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-body-sm text-on-surface outline-none focus:border-primary"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicada</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={salvarDados}
                    disabled={saving}
                    className="rounded-lg bg-primary px-8 py-2 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-outline-variant px-6 py-2 font-bold text-on-surface transition-colors hover:bg-surface-variant"
                  >
                    Descartar
                  </button>
                </div>
              </div>

              {/* Prévia de mídia */}
              <div className="col-span-12 space-y-md lg:col-span-4">
                <label className={labelCls}>Prévia de Mídia</label>
                <div className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-black">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">
                      image
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <label className="cursor-pointer rounded bg-white px-3 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105">
                      {photoBusy ? "ENVIANDO..." : "ALTERAR"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={uploadFoto}
                        disabled={photoBusy}
                      />
                    </label>
                    {photoUrl && (
                      <button
                        onClick={() => setPhotoUrl("")}
                        className="rounded bg-error px-3 py-1.5 text-xs font-bold text-on-error transition-transform hover:scale-105"
                      >
                        REMOVER
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "specs" && (
            <div className="space-y-lg">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Especificações
                </h3>
                <label className="flex cursor-pointer items-center gap-3">
                  <span className="font-label-md text-on-surface-variant opacity-70">
                    Ativar
                  </span>
                  <span
                    onClick={() => setSpecsEnabled((v) => !v)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      specsEnabled ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        specsEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
                <div className="space-y-sm">
                  <label className={labelCls}>
                    Resumo das Especificações e Atributos
                  </label>
                  <textarea
                    className={`${inputCls} h-[200px] resize-none`}
                    placeholder="Ex.: detalhes técnicos sobre o motor e ergonomia..."
                    value={specsSummary}
                    onChange={(e) => setSpecsSummary(e.target.value)}
                  />
                  <p className="text-[11px] text-on-surface-variant opacity-50">
                    Habilite para exibir os detalhes técnicos no player.
                  </p>
                </div>

                <div className="space-y-sm">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Tabela de Atributos</label>
                    <button
                      onClick={() =>
                        setSpecRows((prev) => [...prev, { attribute: "", value: "" }])
                      }
                      className="flex items-center gap-1 font-label-md text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Adicionar Linha
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-outline-variant">
                    <table className="w-full border-collapse text-left">
                      <thead className="border-b border-outline-variant bg-surface-container-low">
                        <tr>
                          <th className="px-4 py-2 font-label-md text-[10px] uppercase text-on-surface-variant">
                            Atributo
                          </th>
                          <th className="px-4 py-2 font-label-md text-[10px] uppercase text-on-surface-variant">
                            Valor
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest">
                        {specRows.map((row, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2">
                              <input
                                className="w-full bg-transparent p-0 text-body-sm text-on-surface outline-none"
                                value={row.attribute}
                                placeholder="Cilindrada"
                                onChange={(e) =>
                                  setSpecRows((prev) =>
                                    prev.map((r, idx) =>
                                      idx === i
                                        ? { ...r, attribute: e.target.value }
                                        : r
                                    )
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                className="w-full bg-transparent p-0 text-body-sm text-on-surface outline-none"
                                value={row.value}
                                placeholder="27,2 cm³"
                                onChange={(e) =>
                                  setSpecRows((prev) =>
                                    prev.map((r, idx) =>
                                      idx === i
                                        ? { ...r, value: e.target.value }
                                        : r
                                    )
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 text-center">
                              <button
                                onClick={() =>
                                  setSpecRows((prev) =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                                className="text-on-surface-variant transition-colors hover:text-error"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-outline-variant/30 pt-4">
                <button
                  onClick={salvarSpecs}
                  disabled={saving}
                  className="rounded-lg bg-primary px-8 py-2 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-outline-variant px-6 py-2 font-bold text-on-surface transition-colors hover:bg-surface-variant"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {tab === "videos" && (
            <div className="space-y-lg">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Gerenciamento de Vídeos
                </h3>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 font-label-md text-primary transition-all hover:bg-primary/20">
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  {videoBusy ?? "ADICIONAR VÍDEO"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={uploadVideo}
                    disabled={!!videoBusy}
                  />
                </label>
              </div>

              {/* Campo discreto: quando a barra de destaques aparece no player. */}
              <label className="flex flex-wrap items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                <span>Mostrar destaques quando faltarem</span>
                <input
                  type="number"
                  min={0}
                  value={highlightsRevealSeconds}
                  onChange={(e) =>
                    setHighlightsRevealSeconds(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-16 rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1 text-center font-body-sm text-on-surface outline-none focus:border-primary"
                />
                <span>s para o vídeo principal terminar (0 = sempre).</span>
              </label>

              {videos.length === 0 ? (
                <p className="py-8 text-center font-body-md text-on-surface-variant">
                  Nenhum vídeo ainda. Envie o vídeo principal e os destaques.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-4">
                  {videos.map((v, i) => (
                    <div
                      key={i}
                      className={`overflow-hidden rounded-xl border bg-surface-container-lowest ${
                        v.is_main ? "border-2 border-primary" : "border-outline-variant"
                      }`}
                    >
                      <div className="relative aspect-[9/16] bg-black">
                        <video
                          src={v.video_url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                        {v.is_main && (
                          <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold uppercase text-on-primary">
                            Principal
                          </span>
                        )}
                        <button
                          onClick={() =>
                            setVideos((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="absolute right-2 top-2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-error/60"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            delete
                          </span>
                        </button>
                      </div>
                      <div className="space-y-2 p-3">
                        <input
                          className="w-full bg-transparent font-label-md text-on-surface outline-none"
                          value={v.title}
                          placeholder="Nome do destaque"
                          onChange={(e) =>
                            setVideos((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, title: e.target.value } : row
                              )
                            )
                          }
                        />
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="main_video"
                            checked={v.is_main}
                            onChange={() =>
                              setVideos((prev) =>
                                prev.map((row, idx) => ({
                                  ...row,
                                  is_main: idx === i,
                                }))
                              )
                            }
                          />
                          <span className="text-body-sm text-on-surface-variant">
                            Vídeo Principal
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={v.is_highlight}
                            onChange={(e) =>
                              setVideos((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, is_highlight: e.target.checked }
                                    : row
                                )
                              )
                            }
                          />
                          <span className="text-body-sm text-on-surface-variant">
                            Mostrar como destaque
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 border-t border-outline-variant/30 pt-4">
                <button
                  onClick={salvarVideos}
                  disabled={saving || !!videoBusy}
                  className="rounded-lg bg-primary px-8 py-2 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-outline-variant px-6 py-2 font-bold text-on-surface transition-colors hover:bg-surface-variant"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
