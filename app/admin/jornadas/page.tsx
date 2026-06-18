import Link from "next/link";
import { createServerAuthClient } from "@/lib/supabase-server";
import { ensureProfile } from "@/lib/admin";
import { createJourney, deleteJourney } from "./actions";
import type { Journey } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Lista de jornadas da empresa + formulário para criar uma nova.
export default async function JornadasPage() {
  const companyId = await ensureProfile();
  const supabase = await createServerAuthClient();

  const { data: journeys } = await supabase
    .from("journeys")
    .select("id, company_id, name, slug, status, start_step_id")
    .eq("company_id", companyId ?? "")
    .order("created_at", { ascending: false })
    .returns<Journey[]>();

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Minhas jornadas
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Crie e edite suas jornadas interativas em vídeo.
          </p>
        </div>
      </div>

      {/* Criar nova jornada */}
      <Card className="mb-8 p-4">
        <form
          action={createJourney}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="ds-label">Nome da nova jornada</span>
            <Input name="name" required placeholder="Ex.: Escolha sua roçadeira" />
          </label>
          <Button type="submit">Criar jornada</Button>
        </form>
      </Card>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {(journeys ?? []).length === 0 && (
          <p className="text-[var(--text-muted)]">
            Nenhuma jornada ainda. Crie a primeira acima.
          </p>
        )}

        {(journeys ?? []).map((j) => (
          <Card
            key={j.id}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{j.name}</span>
                {j.status === "published" ? (
                  <Badge tone="success">Publicada</Badge>
                ) : (
                  <Badge tone="neutral">Rascunho</Badge>
                )}
              </div>
              <span className="text-sm text-[var(--text-muted)]">/j/{j.slug}</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {j.status === "published" && (
                <a
                  href={`/j/${j.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("secondary", "sm")}
                >
                  Ver
                </a>
              )}
              <Link
                href={`/admin/jornadas/${j.id}`}
                className={buttonClasses("primary", "sm")}
              >
                Editar
              </Link>
              <form action={deleteJourney}>
                <input type="hidden" name="id" value={j.id} />
                <Button type="submit" variant="danger" size="sm">
                  Excluir
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
