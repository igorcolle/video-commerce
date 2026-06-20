import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase-server";
import type {
  Journey,
  Step,
  Option,
  Product,
  ProductCategory,
  StepProduct,
  StepField,
} from "@/lib/supabase";
import {
  STEP_COLUMNS,
  OPTION_COLUMNS,
  FIELD_COLUMNS,
  PRODUCT_COLUMNS,
  PRODUCT_CATEGORY_COLUMNS,
  STEP_PRODUCT_COLUMNS,
} from "@/lib/queries";
import JourneyFlow from "@/components/admin/flow/JourneyFlow";
import WidgetPanel from "@/components/admin/WidgetPanel";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { updateJourney, togglePublish } from "./actions";

function stepLabel(s: Step): string {
  const base = s.title || s.question_text || "Etapa";
  if (s.type === "result") return `${base} (resultado)`;
  if (s.type === "collect") return `${base} (coleta)`;
  return base;
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerAuthClient();

  const { data: journey } = await supabase
    .from("journeys")
    .select(
      "id, company_id, name, slug, status, start_step_id, widget_format, widget_border, widget_position, widget_size, widget_border_color"
    )
    .eq("id", id)
    .single<Journey>();

  if (!journey) notFound();

  // Etapas (da jornada), produtos e categorias (da BIBLIOTECA da empresa) → em
  // paralelo. Os produtos vêm na ordem da biblioteca (position) e as categorias
  // por position, para a aba "Produtos" do bloco agrupar na mesma ordem do admin.
  const [{ data: steps }, { data: products }, { data: categories }] =
    await Promise.all([
      supabase
        .from("steps")
        .select(STEP_COLUMNS)
        .eq("journey_id", id)
        .order("position")
        .returns<Step[]>(),
      supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("company_id", journey.company_id)
        .order("position")
        .order("name")
        .returns<Product[]>(),
      supabase
        .from("product_categories")
        .select(PRODUCT_CATEGORY_COLUMNS)
        .eq("company_id", journey.company_id)
        .order("position")
        .returns<ProductCategory[]>(),
    ]);

  const stepList = steps ?? [];
  const stepIds = stepList.map((s) => s.id);
  const safeIds = stepIds.length ? stepIds : ["-"];

  // Opções, vínculos de produto e campos dependem dos stepIds → paralelo.
  const [{ data: options }, { data: stepProducts }, { data: stepFields }] =
    await Promise.all([
      supabase
        .from("options")
        .select(OPTION_COLUMNS)
        .in("step_id", safeIds)
        .order("position")
        .returns<Option[]>(),
      supabase
        .from("step_products")
        .select(STEP_PRODUCT_COLUMNS)
        .in("step_id", safeIds)
        .returns<StepProduct[]>(),
      supabase
        .from("step_fields")
        .select(FIELD_COLUMNS)
        .in("step_id", safeIds)
        .order("position")
        .returns<StepField[]>(),
    ]);

  const productList = products ?? [];
  const isPublished = journey.status === "published";

  // Vídeo da etapa inicial (usado no preview do widget / código de embed).
  const startVideoUrl =
    stepList.find((s) => s.id === journey.start_step_id)?.video_url ?? "";

  return (
    <main className="w-full max-w-none p-6">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/jornadas"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← Voltar
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {journey.name}
            </h1>
            {isPublished ? (
              <Badge tone="success">Publicada</Badge>
            ) : (
              <Badge tone="neutral">Rascunho</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPublished && (
            <a
              href={`/j/${journey.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              Ver player
            </a>
          )}
          <WidgetPanel
            journeyId={journey.id}
            slug={journey.slug}
            startVideoUrl={startVideoUrl}
            initial={{
              format: journey.widget_format ?? "rectangle",
              border: journey.widget_border ?? true,
              borderColor: journey.widget_border_color ?? "#ffffff",
              position: journey.widget_position ?? "right",
              size: journey.widget_size ?? 100,
            }}
          />
          <form action={togglePublish}>
            <input type="hidden" name="id" value={journey.id} />
            <input
              type="hidden"
              name="status"
              value={isPublished ? "draft" : "published"}
            />
            <Button
              type="submit"
              variant={isPublished ? "secondary" : "primary"}
              size="sm"
            >
              {isPublished ? "Despublicar" : "Publicar"}
            </Button>
          </form>
        </div>
      </div>

      {/* Canvas do flow builder */}
      <p className="mb-2 text-sm text-[var(--text-muted)]">
        Monte a jornada arrastando os blocos e ligando cada botão à próxima
        etapa. Clique num bloco para editá-lo.
      </p>
      <JourneyFlow
        journey={journey}
        steps={stepList}
        options={options ?? []}
        products={productList}
        categories={categories ?? []}
        stepProducts={stepProducts ?? []}
        stepFields={stepFields ?? []}
      />

      {/* Configurações da jornada */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-semibold">
          Configurações da jornada
        </summary>
        <Card className="mt-3 p-4">
          <form action={updateJourney} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={journey.id} />
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Nome</span>
              <Input name="name" defaultValue={journey.name} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Endereço (slug) — fica em /j/&lt;slug&gt;</span>
              <Input name="slug" defaultValue={journey.slug ?? ""} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Etapa inicial</span>
              <Select
                name="start_step_id"
                defaultValue={journey.start_step_id ?? ""}
              >
                <option value="">— escolha —</option>
                {stepList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stepLabel(s)}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" size="sm" className="w-fit">
              Salvar configurações
            </Button>
          </form>
        </Card>
      </details>

      {/* Biblioteca de produtos: cadastro agora é centralizado em /admin/produtos.
          Aqui você só escolhe, em cada etapa de resultado, quais produtos da
          biblioteca aparecem (aba "Produtos" do bloco). */}
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Produtos da biblioteca</p>
          <p className="text-sm text-[var(--text-muted)]">
            Os produtos são reutilizáveis entre jornadas. Cadastre e edite na
            biblioteca; aqui basta vinculá-los às etapas de resultado.
            {productList.length > 0 &&
              ` (${productList.length} disponíveis)`}
          </p>
        </div>
        <Link href="/admin/produtos" className={buttonClasses("secondary", "sm")}>
          Abrir biblioteca de produtos
        </Link>
      </Card>
    </main>
  );
}
