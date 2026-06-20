"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProductCategory } from "@/lib/supabase";
import type { FullProduct } from "@/app/admin/produtos/page";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  duplicateProduct,
  renameCategory,
  reorderCategories,
  reorderProducts,
} from "@/app/admin/produtos/actions";
import ProductModal from "./ProductModal";

// Chave usada para agrupar produtos sem categoria.
const NO_CAT = "__none__";

type Props = {
  categories: ProductCategory[];
  products: FullProduct[];
};

export default function ProductsClient({ categories, products }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<FullProduct | null>(null);
  const [pending, setPending] = useState(false);
  // Id do produto cujo link acabou de ser copiado (feedback rápido).
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado local (ordem otimista do drag-n-drop). Ressincroniza quando o
  // servidor devolve novos dados (router.refresh após cada ação) usando o
  // padrão "ajustar estado durante o render" (sem useEffect).
  const [localCats, setLocalCats] = useState<ProductCategory[]>(categories);
  const [localProducts, setLocalProducts] = useState<FullProduct[]>(products);
  const [prevCats, setPrevCats] = useState(categories);
  const [prevProducts, setPrevProducts] = useState(products);
  if (prevCats !== categories) {
    setPrevCats(categories);
    setLocalCats(categories);
  }
  if (prevProducts !== products) {
    setPrevProducts(products);
    setLocalProducts(products);
  }

  // Sensor de ponteiro com pequena distância: clique != arrasto.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Só permite reordenar quando NÃO há busca (reordenar lista filtrada confunde).
  const dndEnabled = busca.trim() === "";

  // Link público do player do produto.
  function playerUrl(productId: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/p/${productId}`;
  }

  async function copiarLink(productId: string) {
    try {
      await navigator.clipboard.writeText(playerUrl(productId));
      setCopiedId(productId);
      setTimeout(() => setCopiedId((c) => (c === productId ? null : c)), 1500);
    } catch {
      window.prompt("Copie o link do player:", playerUrl(productId));
    }
  }

  // Filtra por nome (busca simples).
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return localProducts;
    return localProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [busca, localProducts]);

  // Agrupa produtos por categoria.
  const grupos = useMemo(() => {
    const map = new Map<string, FullProduct[]>();
    for (const p of filtrados) {
      const key = p.category_id ?? NO_CAT;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtrados]);

  async function run(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function novaCategoria() {
    const name = window.prompt("Nome da nova categoria:");
    if (!name) return;
    const fd = new FormData();
    fd.set("name", name);
    run(() => createCategory(fd));
  }

  function novoProduto(categoryId?: string) {
    const fd = new FormData();
    fd.set("name", "Novo produto");
    if (categoryId) fd.set("category_id", categoryId);
    run(() => createProduct(fd));
  }

  // Drag-n-drop: reordena CATEGORIAS.
  function onCatDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = localCats.map((c) => c.id);
    const oldI = ids.indexOf(String(active.id));
    const newI = ids.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(localCats, oldI, newI);
    setLocalCats(next);
    run(() => reorderCategories(next.map((c) => c.id)));
  }

  // Drag-n-drop: reordena PRODUTOS dentro de uma categoria.
  function onProductDragEnd(catId: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const inCat = localProducts.filter((p) => (p.category_id ?? NO_CAT) === catId);
    const others = localProducts.filter((p) => (p.category_id ?? NO_CAT) !== catId);
    const ids = inCat.map((p) => p.id);
    const oldI = ids.indexOf(String(active.id));
    const newI = ids.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const reordered = arrayMove(inCat, oldI, newI);
    setLocalProducts([...others, ...reordered]);
    run(() => reorderProducts(reordered.map((p) => p.id)));
  }

  // Lista de categorias reais (na ordem local) + "Sem categoria" no fim.
  const hasNoCat = grupos.has(NO_CAT);

  return (
    <section className="workbench-bg min-h-[calc(100vh-3.5rem)] overflow-y-auto bg-surface p-lg">
      <div className="mx-auto max-w-7xl space-y-lg">
        {/* Cabeçalho da página */}
        <div className="mb-lg flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              Produtos
            </h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Gerencie a biblioteca de produtos usada nas suas jornadas de vídeo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="w-48 rounded-full border border-outline-variant bg-surface-container-low py-1.5 pl-9 pr-4 text-body-sm text-on-surface outline-none transition-all focus:w-64 focus:border-primary"
              />
            </div>
            <div className="mx-1 h-6 w-px bg-outline-variant" />
            <button
              onClick={novaCategoria}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg p-2 text-on-surface transition-all hover:bg-surface-variant disabled:opacity-50"
              title="Nova categoria"
            >
              <span className="material-symbols-outlined text-[20px]">
                create_new_folder
              </span>
              <span className="hidden font-label-md text-label-md xl:block">
                Categoria
              </span>
            </button>
            <button
              onClick={() => novoProduto()}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="font-label-md text-label-md">Produto</span>
            </button>
          </div>
        </div>

        {/* Dica de reordenação */}
        {dndEnabled && (localCats.length > 0 || hasNoCat) && (
          <p className="font-label-md text-[11px] text-on-surface-variant/60">
            Arraste pelo ícone <span className="align-middle material-symbols-outlined text-[14px]">drag_indicator</span> para reordenar categorias e produtos.
          </p>
        )}

        {/* Pastas / categorias */}
        <div className="space-y-4">
          {localCats.length === 0 && !hasNoCat && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="font-body-md text-on-surface-variant">
                Nenhum produto ainda. Crie uma categoria e adicione produtos.
              </p>
            </div>
          )}

          {/* Categorias reais: arrastáveis (quando não há busca) */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onCatDragEnd}
          >
            <SortableContext
              items={localCats.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {localCats.map((cat) => (
                  <SortableCategory key={cat.id} id={cat.id} disabled={!dndEnabled}>
                    {(handleProps) => (
                      <CategoryBlock
                        id={cat.id}
                        name={cat.name}
                        itens={grupos.get(cat.id) ?? []}
                        isReal
                        dndEnabled={dndEnabled}
                        handleProps={handleProps}
                        copiedId={copiedId}
                        onAddProduct={() => novoProduto(cat.id)}
                        onRename={() => {
                          const name = window.prompt("Renomear categoria:", cat.name);
                          if (!name) return;
                          const fd = new FormData();
                          fd.set("id", cat.id);
                          fd.set("name", name);
                          run(() => renameCategory(fd));
                        }}
                        onDelete={() => {
                          if (
                            !window.confirm(
                              `Excluir a categoria "${cat.name}"? Os produtos ficam sem categoria.`
                            )
                          )
                            return;
                          const fd = new FormData();
                          fd.set("id", cat.id);
                          run(() => deleteCategory(fd));
                        }}
                        onEdit={(p) => setEditing(p)}
                        onCopyLink={copiarLink}
                        onDuplicate={(p) => {
                          const fd = new FormData();
                          fd.set("id", p.id);
                          run(() => duplicateProduct(fd));
                        }}
                        onDeleteProduct={(p) => {
                          if (!window.confirm(`Excluir o produto "${p.name}"?`)) return;
                          const fd = new FormData();
                          fd.set("id", p.id);
                          run(() => deleteProduct(fd));
                        }}
                        onProductDragEnd={(e) => onProductDragEnd(cat.id, e)}
                        sensors={sensors}
                      />
                    )}
                  </SortableCategory>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* "Sem categoria": fica no fim e não é arrastável. */}
          {hasNoCat && (
            <CategoryBlock
              id={NO_CAT}
              name="Sem categoria"
              itens={grupos.get(NO_CAT) ?? []}
              isReal={false}
              dndEnabled={dndEnabled}
              copiedId={copiedId}
              onEdit={(p) => setEditing(p)}
              onCopyLink={copiarLink}
              onDuplicate={(p) => {
                const fd = new FormData();
                fd.set("id", p.id);
                run(() => duplicateProduct(fd));
              }}
              onDeleteProduct={(p) => {
                if (!window.confirm(`Excluir o produto "${p.name}"?`)) return;
                const fd = new FormData();
                fd.set("id", p.id);
                run(() => deleteProduct(fd));
              }}
              onProductDragEnd={(e) => onProductDragEnd(NO_CAT, e)}
              sensors={sensors}
            />
          )}
        </div>
      </div>

      {editing && (
        <ProductModal
          product={editing}
          categories={localCats}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Wrapper sortable de uma CATEGORIA. Injeta os props do "handle" (ícone de
// arrastar) no filho via render-prop.
// ---------------------------------------------------------------------------
type HandleProps = Record<string, unknown>;

function SortableCategory({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (handleProps: HandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bloco de uma categoria (pasta) com sua tabela de produtos.
// ---------------------------------------------------------------------------
type CategoryBlockProps = {
  id: string;
  name: string;
  itens: FullProduct[];
  isReal: boolean;
  dndEnabled: boolean;
  handleProps?: HandleProps;
  copiedId: string | null;
  onAddProduct?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onEdit: (p: FullProduct) => void;
  onCopyLink: (id: string) => void;
  onDuplicate: (p: FullProduct) => void;
  onDeleteProduct: (p: FullProduct) => void;
  onProductDragEnd: (e: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
};

function CategoryBlock({
  name,
  itens,
  isReal,
  dndEnabled,
  handleProps,
  copiedId,
  onAddProduct,
  onRename,
  onDelete,
  onEdit,
  onCopyLink,
  onDuplicate,
  onDeleteProduct,
  onProductDragEnd,
  sensors,
}: CategoryBlockProps) {
  return (
    <details
      className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
      open
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between p-4 transition-colors hover:bg-surface-container-low">
        <div className="flex items-center gap-3">
          {/* Handle de arrastar (só categorias reais e sem busca) */}
          {isReal && dndEnabled && (
            <span
              {...(handleProps ?? {})}
              onClick={(e) => e.preventDefault()}
              className="cursor-grab text-on-surface-variant/50 hover:text-on-surface active:cursor-grabbing"
              title="Arraste para reordenar"
            >
              <span className="material-symbols-outlined text-[20px] align-middle">
                drag_indicator
              </span>
            </span>
          )}
          <span className="material-symbols-outlined text-primary transition-transform group-open:rotate-90">
            chevron_right
          </span>
          <span className="material-symbols-outlined text-on-surface-variant">
            folder
          </span>
          <span className="font-headline-md text-headline-md text-on-surface">
            {name}
          </span>
          <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-md text-[10px] text-on-surface-variant">
            {itens.length} {itens.length === 1 ? "PRODUTO" : "PRODUTOS"}
          </span>
        </div>
        {isReal && (
          <div className="flex items-center gap-2 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddProduct?.();
              }}
              className="rounded p-1.5 hover:bg-surface-variant"
              title="Adicionar produto aqui"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onRename?.();
              }}
              className="rounded p-1.5 hover:bg-surface-variant"
              title="Renomear"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete?.();
              }}
              className="rounded p-1.5 text-error/70 hover:bg-surface-variant hover:text-error"
              title="Excluir categoria"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        )}
      </summary>

      <div className="border-t border-outline-variant/30">
        {itens.length === 0 ? (
          <p className="px-md py-6 text-center font-body-sm text-on-surface-variant">
            Sem produtos nesta categoria.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onProductDragEnd}
          >
            <SortableContext
              items={itens.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-outline-variant bg-surface-container-low/50">
                  <tr>
                    <th className="w-8 px-1 py-3" />
                    <th className="w-16 px-md py-3 text-center font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Img
                    </th>
                    <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Nome do Produto
                    </th>
                    <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-md py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Link
                    </th>
                    <th className="px-md py-3 text-right font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {itens.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      dndEnabled={dndEnabled}
                      copiedId={copiedId}
                      onEdit={onEdit}
                      onCopyLink={onCopyLink}
                      onDuplicate={onDuplicate}
                      onDeleteProduct={onDeleteProduct}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Linha de produto (arrastável dentro da categoria).
// ---------------------------------------------------------------------------
function ProductRow({
  product: p,
  dndEnabled,
  copiedId,
  onEdit,
  onCopyLink,
  onDuplicate,
  onDeleteProduct,
}: {
  product: FullProduct;
  dndEnabled: boolean;
  copiedId: string | null;
  onEdit: (p: FullProduct) => void;
  onCopyLink: (id: string) => void;
  onDuplicate: (p: FullProduct) => void;
  onDeleteProduct: (p: FullProduct) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id, disabled: !dndEnabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(p)}
      className="group/row cursor-pointer transition-colors hover:bg-surface-container-low"
    >
      <td className="px-1 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        {dndEnabled && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-on-surface-variant/40 hover:text-on-surface active:cursor-grabbing"
            title="Arraste para reordenar"
          >
            <span className="material-symbols-outlined text-[18px] align-middle">
              drag_indicator
            </span>
          </span>
        )}
      </td>
      <td className="px-md py-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-outline-variant bg-black">
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.photo_url}
              alt={p.name}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant/40">
              image
            </span>
          )}
        </div>
      </td>
      <td className="px-md py-2">
        <div className="font-label-md font-bold text-on-surface">{p.name}</div>
        {p.tag && (
          <span
            className="font-mono-sm text-[10px]"
            style={{ color: p.tag_color ?? undefined }}
          >
            #{p.tag}
          </span>
        )}
      </td>
      <td className="px-md py-2">
        {p.status === "published" ? (
          <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-label-md text-[10px] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            PUBLICADA
          </span>
        ) : (
          <span className="inline-flex items-center rounded border border-outline-variant bg-surface-variant px-2 py-0.5 font-label-md text-[10px] uppercase text-on-surface-variant">
            Rascunho
          </span>
        )}
      </td>
      <td className="px-md py-2">
        <span className="block max-w-[200px] truncate font-mono-sm text-on-surface-variant">
          {p.buy_link || "—"}
        </span>
      </td>
      <td className="px-md py-2 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
          <button
            onClick={() => window.open(`/p/${p.id}`, "_blank")}
            className="rounded p-1.5 text-on-surface-variant transition-colors hover:text-primary"
            title="Abrir player do produto"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          </button>
          <button
            onClick={() => onCopyLink(p.id)}
            className="rounded p-1.5 text-on-surface-variant transition-colors hover:text-primary"
            title={copiedId === p.id ? "Link copiado!" : "Copiar link do player"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {copiedId === p.id ? "check" : "link"}
            </span>
          </button>
          <button
            onClick={() => onEdit(p)}
            className="rounded p-1.5 text-on-surface-variant transition-colors hover:text-primary"
            title="Editar"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => onDuplicate(p)}
            className="rounded p-1.5 text-on-surface-variant transition-colors hover:text-on-surface"
            title="Duplicar"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
          <button
            onClick={() => onDeleteProduct(p)}
            className="rounded p-1.5 text-error/60 transition-colors hover:text-error"
            title="Excluir"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
