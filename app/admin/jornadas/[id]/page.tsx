import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase-server";
import type {
  Journey,
  Step,
  Option,
  Product,
  StepProduct,
  StepField,
} from "@/lib/supabase";
import JourneyFlow from "@/components/admin/flow/JourneyFlow";
import WidgetPanel from "@/components/admin/WidgetPanel";
import ProductPhotoUpload from "@/components/admin/ProductPhotoUpload";
import ProductButtons from "@/components/admin/ProductButtons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import {
  updateJourney,
  togglePublish,
  addProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
} from "./actions";

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

  const { data: steps } = await supabase
    .from("steps")
    .select(
      "id, journey_id, type, title, question_text, video_url, position, next_step_id, pos_x, pos_y, buttons_layout, button_template, button_color, button_opacity, button_font_color, button_font, button_border_color, button_shadow, buttons_reveal_enabled, buttons_reveal_seconds, question_position, question_font_size, question_font_color, question_bg_enabled, question_bg_color, button_text_size, result_cta"
    )
    .eq("journey_id", id)
    .order("position")
    .returns<Step[]>();

  const stepList = steps ?? [];
  const stepIds = stepList.map((s) => s.id);

  const { data: options } = await supabase
    .from("options")
    .select("id, step_id, label, subtitle, icon, next_step_id, position")
    .in("step_id", stepIds.length ? stepIds : ["-"])
    .order("position")
    .returns<Option[]>();

  const { data: products } = await supabase
    .from("products")
    .select("id, journey_id, name, photo_url, benefits, buy_link, whatsapp, buttons")
    .eq("journey_id", id)
    .returns<Product[]>();

  const { data: stepProducts } = await supabase
    .from("step_products")
    .select("step_id, product_id, position")
    .in("step_id", stepIds.length ? stepIds : ["-"])
    .returns<StepProduct[]>();

  const { data: stepFields } = await supabase
    .from("step_fields")
    .select("id, step_id, kind, label, required, position")
    .in("step_id", stepIds.length ? stepIds : ["-"])
    .order("position")
    .returns<StepField[]>();

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

      {/* Produtos da jornada */}
      <details className="mt-4" open>
        <summary className="cursor-pointer text-sm font-semibold">
          Produtos da jornada ({productList.length})
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {productList.map((p) => (
            <Card key={p.id} className="p-4">
              <form action={updateProduct} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="journey_id" value={journey.id} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Nome</span>
                    <Input name="name" defaultValue={p.name} />
                  </label>
                  <ProductPhotoUpload
                    journeyId={journey.id}
                    productId={p.id}
                    initialUrl={p.photo_url}
                  />
                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Link</span>
                    <Input name="buy_link" defaultValue={p.buy_link ?? ""} />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="ds-label">Descrição</span>
                  <Textarea name="benefits" rows={2} defaultValue={p.benefits ?? ""} />
                </label>
                <ProductButtons initial={p.buttons ?? []} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="w-fit">
                    Salvar produto
                  </Button>
                  <Button
                    formAction={duplicateProduct}
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                  >
                    Duplicar
                  </Button>
                  <Button
                    formAction={deleteProduct}
                    variant="danger"
                    size="sm"
                    className="w-fit"
                  >
                    Excluir
                  </Button>
                </div>
              </form>
            </Card>
          ))}

          {/* Adicionar produto */}
          <Card className="p-4">
            <form action={addProduct} className="flex items-end gap-2">
              <input type="hidden" name="journey_id" value={journey.id} />
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="ds-label">Novo produto</span>
                <Input name="name" required placeholder="Ex.: STIHL FS 120" />
              </label>
              <Button type="submit" variant="secondary" size="sm">
                + Adicionar
              </Button>
            </form>
          </Card>
        </div>
      </details>
    </main>
  );
}
