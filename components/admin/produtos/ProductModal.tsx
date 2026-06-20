"use client";

import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase-browser";
import { compressVideo } from "@/lib/compressVideo";
import type {
  ProductCategory,
  ProductAction,
  ProductActionKind,
  ProductFormField,
  ProductVideoButton,
  FieldKind,
} from "@/lib/supabase";
import type { FullProduct } from "@/app/admin/produtos/page";
import { saveProduct } from "@/app/admin/produtos/actions";
import OptionIcon from "@/components/ui/OptionIcon";

type Tab = "dados" | "specs" | "acoes" | "videos";

type VideoRow = {
  title: string;
  video_url: string;
  thumb_url: string;
  is_main: boolean;
  is_highlight: boolean;
  buttons: ProductVideoButton[];
};

// Produto mínimo para o seletor do botão tipo "produto".
type ProductRef = {
  id: string;
  name: string;
  photo_url: string | null;
  summary: string | null;
};

type Props = {
  product: FullProduct;
  categories: ProductCategory[];
  allProducts: ProductRef[];
  onClose: () => void;
  onSaved: () => void;
};

// Cria um novo botão de ação com valores padrão.
function newAction(): ProductAction {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    kind: "custom",
    label: "Botão",
    subtitle: "",
    icon: "",
    color: "#4be277",
    opacity: 1,
    url: "",
    whatsapp: "",
    productId: "",
    fields: [],
  };
}

// Garante v dentro de [lo, hi].
function clampNum(v: number, lo: number, hi: number): number {
  if (hi < lo) return lo;
  return Math.min(hi, Math.max(lo, v));
}

// Primeira lacuna livre do timeline (>=1s), com duração padrão ~5s, sem colidir
// com os intervalos já existentes no vídeo.
function firstFreeGap(
  btns: ProductVideoButton[],
  dur: number
): [number, number] {
  const sorted = [...btns].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const o of sorted) {
    if (o.start - cursor >= 1) return [cursor, Math.min(o.start, cursor + 5)];
    cursor = Math.max(cursor, o.end);
  }
  const start = Math.min(cursor, Math.max(0, dur - 1));
  return [start, Math.min(dur, start + 5)];
}

const KIND_LABELS: Record<ProductActionKind, string> = {
  custom: "Botão personalizado",
  whatsapp: "WhatsApp",
  product: "Produto",
  form: "Formulário",
};

const FIELD_LABELS: Record<FieldKind, string> = {
  full_name: "Nome completo",
  email: "E-mail",
  whatsapp: "WhatsApp",
  custom: "Pergunta personalizada",
};

export default function ProductModal({
  product,
  categories,
  allProducts,
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

  // ----- Aba "Ações"
  const [actions, setActions] = useState<ProductAction[]>(
    product.action_buttons ?? []
  );

  // ----- Aba "Vídeos"
  const [videos, setVideos] = useState<VideoRow[]>(
    product.videos.map((v) => ({
      title: v.title ?? "",
      video_url: v.video_url,
      thumb_url: v.thumb_url ?? "",
      is_main: v.is_main,
      is_highlight: v.is_highlight,
      buttons: v.buttons ?? [],
    }))
  );
  const [videoBusy, setVideoBusy] = useState<string | null>(null);
  // Duração (s) de cada vídeo, lida ao carregar — define o máximo dos sliders.
  const [videoDurations, setVideoDurations] = useState<Record<number, number>>({});
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
          buttons: [],
        },
      ]);
    } finally {
      setVideoBusy(null);
    }
  }

  // ---------------------------------------------------- AÇÕES (helpers)

  function updateAction(id: string, patch: Partial<ProductAction>) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function removeAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
    // Remove também os posicionamentos desse botão em todos os vídeos.
    setVideos((prev) =>
      prev.map((v) => ({ ...v, buttons: v.buttons.filter((b) => b.actionId !== id) }))
    );
  }
  function addFormField(actionId: string) {
    const a = actions.find((x) => x.id === actionId);
    const fields: ProductFormField[] = [
      ...(a?.fields ?? []),
      { kind: "full_name", label: "Nome completo", required: true },
    ];
    updateAction(actionId, { fields });
  }
  function updateFormField(
    actionId: string,
    idx: number,
    patch: Partial<ProductFormField>
  ) {
    const a = actions.find((x) => x.id === actionId);
    const fields = (a?.fields ?? []).map((f, i) =>
      i === idx ? { ...f, ...patch } : f
    );
    updateAction(actionId, { fields });
  }
  function removeFormField(actionId: string, idx: number) {
    const a = actions.find((x) => x.id === actionId);
    const fields = (a?.fields ?? []).filter((_, i) => i !== idx);
    updateAction(actionId, { fields });
  }

  // ---------------------------------------------------- VÍDEOS (helpers)

  function setVideoButtons(
    i: number,
    updater: (btns: ProductVideoButton[]) => ProductVideoButton[]
  ) {
    setVideos((prev) =>
      prev.map((row, idx) =>
        idx === i ? { ...row, buttons: updater(row.buttons) } : row
      )
    );
  }
  function togglePlacement(i: number, actionId: string, dur: number) {
    setVideoButtons(i, (btns) => {
      if (btns.some((b) => b.actionId === actionId))
        return btns.filter((b) => b.actionId !== actionId);
      // Posiciona o novo botão na primeira lacuna livre (evita colidir).
      const [start, end] = firstFreeGap(btns, dur);
      return [...btns, { actionId, start, end }];
    });
  }
  // Move o INÍCIO de um botão sem invadir o intervalo de outro botão do vídeo.
  function setPlacementStart(i: number, actionId: string, value: number) {
    setVideoButtons(i, (btns) => {
      const pl = btns.find((b) => b.actionId === actionId);
      if (!pl) return btns;
      const others = btns.filter((b) => b.actionId !== actionId);
      const lo = Math.max(0, ...others.filter((o) => o.end <= pl.start).map((o) => o.end));
      const start = clampNum(value, lo, pl.end);
      return btns.map((b) => (b.actionId === actionId ? { ...b, start } : b));
    });
  }
  // Move o FIM de um botão sem invadir o intervalo de outro botão do vídeo.
  function setPlacementEnd(
    i: number,
    actionId: string,
    value: number,
    dur: number
  ) {
    setVideoButtons(i, (btns) => {
      const pl = btns.find((b) => b.actionId === actionId);
      if (!pl) return btns;
      const others = btns.filter((b) => b.actionId !== actionId);
      const hi = Math.min(dur, ...others.filter((o) => o.start >= pl.end).map((o) => o.start));
      const end = clampNum(value, pl.start, hi);
      return btns.map((b) => (b.actionId === actionId ? { ...b, end } : b));
    });
  }

  // ---------------------------------------------------------------- SALVAR

  // Salva TODAS as abas de uma vez (corrige a perda de dados ao trocar de aba).
  async function salvar() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", product.id);
      // Dados
      fd.set("name", name);
      fd.set("category_id", categoryId);
      fd.set("tag", tag);
      fd.set("tag_color", tagColor);
      fd.set("buy_link", buyLink);
      fd.set("summary", summary);
      fd.set("description", description);
      fd.set("photo_url", photoUrl);
      fd.set("status", status);
      // Especificações
      fd.set("specs_enabled", specsEnabled ? "true" : "false");
      fd.set("specs_summary", specsSummary);
      fd.set("specs_json", JSON.stringify(specRows));
      // Ações
      fd.set("action_buttons_json", JSON.stringify(actions));
      // Vídeos
      fd.set("highlights_reveal_seconds", String(highlightsRevealSeconds));
      fd.set("videos_json", JSON.stringify(videos));
      await saveProduct(fd);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-md text-on-surface outline-none transition-colors focus:border-primary";
  const labelCls = "block font-label-md text-label-md text-on-surface-variant";
  const smallInputCls =
    "w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1 font-body-sm text-on-surface outline-none focus:border-primary";

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
            ["acoes", "Ações"],
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
        <div className="custom-scrollbar flex-1 overflow-y-auto p-lg">
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
                        className={`${inputCls} flex-1`}
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
            </div>
          )}

          {tab === "acoes" && (
            <div className="space-y-lg">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    Botões de Ação
                  </h3>
                  <p className="text-[11px] text-on-surface-variant opacity-60">
                    Cadastre botões para usar sobre os vídeos (aba Vídeos).
                  </p>
                </div>
                <button
                  onClick={() => setActions((prev) => [...prev, newAction()])}
                  className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 font-label-md text-primary transition-all hover:bg-primary/20"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Adicionar botão
                </button>
              </div>

              {actions.length === 0 ? (
                <p className="py-8 text-center font-body-md text-on-surface-variant">
                  Nenhum botão ainda. Clique em &quot;Adicionar botão&quot;.
                </p>
              ) : (
                <div className="space-y-md">
                  {actions.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                    >
                      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
                        {/* Coluna de edição */}
                        <div className="space-y-sm">
                          <div className="flex items-center justify-between">
                            <select
                              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-body-sm text-on-surface outline-none focus:border-primary"
                              value={a.kind}
                              onChange={(e) =>
                                updateAction(a.id, {
                                  kind: e.target.value as ProductActionKind,
                                })
                              }
                            >
                              {(Object.keys(KIND_LABELS) as ProductActionKind[]).map(
                                (k) => (
                                  <option key={k} value={k}>
                                    {KIND_LABELS[k]}
                                  </option>
                                )
                              )}
                            </select>
                            <button
                              onClick={() => removeAction(a.id)}
                              className="text-on-surface-variant transition-colors hover:text-error"
                              title="Remover botão"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                delete
                              </span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className={labelCls}>Texto Principal</label>
                              <input
                                className={smallInputCls}
                                value={a.label}
                                onChange={(e) =>
                                  updateAction(a.id, { label: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={labelCls}>Texto secundário</label>
                              <input
                                className={smallInputCls}
                                value={a.subtitle ?? ""}
                                onChange={(e) =>
                                  updateAction(a.id, { subtitle: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className={labelCls}>Ícone/Emoji</label>
                              <input
                                className={smallInputCls}
                                placeholder="🔥"
                                value={a.icon ?? ""}
                                onChange={(e) =>
                                  updateAction(a.id, { icon: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={labelCls}>Cor</label>
                              <input
                                type="color"
                                className="h-8 w-full cursor-pointer rounded-md border border-outline-variant bg-transparent"
                                value={a.color}
                                onChange={(e) =>
                                  updateAction(a.id, { color: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={labelCls}>
                                Opacidade {Math.round((a.opacity ?? 1) * 100)}%
                              </label>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                value={Math.round((a.opacity ?? 1) * 100)}
                                onChange={(e) =>
                                  updateAction(a.id, {
                                    opacity: Number(e.target.value) / 100,
                                  })
                                }
                                className="w-full"
                              />
                            </div>
                          </div>

                          {/* Campos específicos por tipo */}
                          {a.kind === "custom" && (
                            <div className="space-y-1">
                              <label className={labelCls}>Link de destino</label>
                              <input
                                className={`${smallInputCls} font-mono-sm`}
                                placeholder="https://..."
                                value={a.url ?? ""}
                                onChange={(e) =>
                                  updateAction(a.id, { url: e.target.value })
                                }
                              />
                            </div>
                          )}

                          {a.kind === "whatsapp" && (
                            <div className="space-y-1">
                              <label className={labelCls}>Número (com DDI)</label>
                              <input
                                className={`${smallInputCls} font-mono-sm`}
                                placeholder="5511999999999"
                                value={a.whatsapp ?? ""}
                                onChange={(e) =>
                                  updateAction(a.id, { whatsapp: e.target.value })
                                }
                              />
                            </div>
                          )}

                          {a.kind === "product" && (
                            <div className="space-y-1">
                              <label className={labelCls}>Produto de destino</label>
                              <select
                                className={smallInputCls}
                                value={a.productId ?? ""}
                                onChange={(e) =>
                                  updateAction(a.id, { productId: e.target.value })
                                }
                              >
                                <option value="">Selecione...</option>
                                {allProducts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              {(() => {
                                const ref = allProducts.find(
                                  (p) => p.id === a.productId
                                );
                                if (!ref) return null;
                                return (
                                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-2">
                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-outline-variant bg-black">
                                      {ref.photo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={ref.photo_url}
                                          alt={ref.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="material-symbols-outlined text-on-surface-variant/40">
                                          image
                                        </span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate font-label-md font-bold text-on-surface">
                                        {ref.name}
                                      </div>
                                      {ref.summary && (
                                        <div className="truncate text-[11px] text-on-surface-variant">
                                          {ref.summary}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {a.kind === "form" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className={labelCls}>Campos do formulário</label>
                                <button
                                  onClick={() => addFormField(a.id)}
                                  className="flex items-center gap-1 font-label-md text-primary hover:underline"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    add
                                  </span>
                                  Campo
                                </button>
                              </div>
                              {(a.fields ?? []).length === 0 && (
                                <p className="text-[11px] text-on-surface-variant opacity-60">
                                  Adicione os campos que o visitante deve preencher
                                  (vira um lead).
                                </p>
                              )}
                              {(a.fields ?? []).map((f, fi) => (
                                <div
                                  key={fi}
                                  className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low p-2"
                                >
                                  <select
                                    className="rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1 text-[12px] text-on-surface outline-none focus:border-primary"
                                    value={f.kind}
                                    onChange={(e) =>
                                      updateFormField(a.id, fi, {
                                        kind: e.target.value as FieldKind,
                                      })
                                    }
                                  >
                                    {(Object.keys(FIELD_LABELS) as FieldKind[]).map(
                                      (k) => (
                                        <option key={k} value={k}>
                                          {FIELD_LABELS[k]}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <input
                                    className={smallInputCls}
                                    placeholder="Rótulo do campo"
                                    value={f.label}
                                    onChange={(e) =>
                                      updateFormField(a.id, fi, {
                                        label: e.target.value,
                                      })
                                    }
                                  />
                                  <label className="flex shrink-0 items-center gap-1 text-[11px] text-on-surface-variant">
                                    <input
                                      type="checkbox"
                                      checked={f.required}
                                      onChange={(e) =>
                                        updateFormField(a.id, fi, {
                                          required: e.target.checked,
                                        })
                                      }
                                    />
                                    Obrig.
                                  </label>
                                  <button
                                    onClick={() => removeFormField(a.id, fi)}
                                    className="shrink-0 text-on-surface-variant transition-colors hover:text-error"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Coluna de prévia */}
                        <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-black/80 p-4">
                          <span className="font-label-md text-[10px] uppercase text-white/40">
                            Prévia
                          </span>
                          <div
                            className="relative flex w-full max-w-[260px] items-center gap-3 overflow-hidden rounded-full px-5 py-3 text-white shadow-lg"
                            style={{ backgroundColor: "transparent" }}
                          >
                            <span
                              aria-hidden
                              className="absolute inset-0"
                              style={{
                                backgroundColor: a.color,
                                opacity: a.opacity ?? 1,
                              }}
                            />
                            <span className="relative z-10 flex items-center gap-3">
                              {a.icon && (
                                <OptionIcon
                                  value={a.icon}
                                  size={22}
                                  className="shrink-0 text-2xl leading-none"
                                />
                              )}
                              <span className="min-w-0 text-left">
                                <span className="block truncate font-bold leading-tight">
                                  {a.label || "Botão"}
                                </span>
                                {a.subtitle && (
                                  <span className="block truncate text-sm leading-tight opacity-90">
                                    {a.subtitle}
                                  </span>
                                )}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                  {videos.map((v, i) => {
                    const dur = Math.max(1, Math.round(videoDurations[i] ?? 30));
                    return (
                      <div
                        key={i}
                        className={`overflow-hidden rounded-xl border bg-surface-container-lowest ${
                          v.is_main ? "border-2 border-primary" : "border-outline-variant"
                        }`}
                      >
                        <div className="flex gap-3 p-3">
                          <div className="relative aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                            <video
                              src={v.video_url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              onLoadedMetadata={(e) => {
                                const d = e.currentTarget.duration;
                                if (d && isFinite(d))
                                  setVideoDurations((prev) => ({ ...prev, [i]: d }));
                              }}
                            />
                            {v.is_main && (
                              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-on-primary">
                                Principal
                              </span>
                            )}
                            <button
                              onClick={() =>
                                setVideos((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="absolute right-1 top-1 flex items-center justify-center rounded-full bg-black/40 p-1 text-white transition-colors hover:bg-error/60"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                delete
                              </span>
                            </button>
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
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
                            <label className="flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant">
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
                              Vídeo Principal
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant">
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
                              Mostrar como destaque
                            </label>
                          </div>
                        </div>

                        {/* Botões posicionados neste vídeo (timing por slider). */}
                        {actions.length > 0 && (
                          <div className="space-y-2 border-t border-outline-variant/30 bg-surface-container-low px-3 py-2">
                            <div className="flex items-center justify-between">
                              <p className="font-label-md text-[10px] uppercase text-on-surface-variant">
                                Botões neste vídeo
                              </p>
                              <span className="text-[10px] text-on-surface-variant/60">
                                {dur}s
                              </span>
                            </div>

                            {/* Mini-timeline: segmentos coloridos de cada botão
                                (0..duração). Mostra de relance onde cada um
                                aparece e que não há sobreposição. */}
                            {v.buttons.length > 0 && (
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                                {v.buttons.map((b) => {
                                  const a = actions.find((x) => x.id === b.actionId);
                                  if (!a) return null;
                                  const left = (b.start / dur) * 100;
                                  const width = ((b.end - b.start) / dur) * 100;
                                  return (
                                    <span
                                      key={b.actionId}
                                      className="absolute top-0 h-full rounded-full"
                                      style={{
                                        left: `${left}%`,
                                        width: `${Math.max(width, 1)}%`,
                                        backgroundColor: a.color,
                                      }}
                                      title={`${a.label}: ${b.start}s–${b.end}s`}
                                    />
                                  );
                                })}
                              </div>
                            )}

                            {actions.map((a) => {
                              const pl = v.buttons.find((b) => b.actionId === a.id);
                              return (
                                <div key={a.id} className="space-y-1">
                                  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-on-surface">
                                    <input
                                      type="checkbox"
                                      checked={!!pl}
                                      onChange={() => togglePlacement(i, a.id, dur)}
                                    />
                                    <span
                                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: a.color }}
                                    />
                                    <span className="truncate">
                                      {a.label || "Botão"}
                                    </span>
                                  </label>
                                  {pl && (
                                    <div className="grid grid-cols-2 gap-2 pl-6">
                                      <label className="text-[11px] text-on-surface-variant">
                                        Início: {pl.start}s
                                        <input
                                          type="range"
                                          min={0}
                                          max={dur}
                                          value={pl.start}
                                          onChange={(e) =>
                                            setPlacementStart(
                                              i,
                                              a.id,
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-full"
                                        />
                                      </label>
                                      <label className="text-[11px] text-on-surface-variant">
                                        Fim: {pl.end}s
                                        <input
                                          type="range"
                                          min={0}
                                          max={dur}
                                          value={pl.end}
                                          onChange={(e) =>
                                            setPlacementEnd(
                                              i,
                                              a.id,
                                              Number(e.target.value),
                                              dur
                                            )
                                          }
                                          className="w-full"
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé único: salva TODAS as abas de uma vez. */}
        <div className="flex gap-3 border-t border-outline-variant bg-surface-container-high px-lg py-3">
          <button
            onClick={salvar}
            disabled={saving || !!videoBusy}
            className="rounded-lg bg-primary px-8 py-2 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-6 py-2 font-bold text-on-surface transition-colors hover:bg-surface-variant"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
