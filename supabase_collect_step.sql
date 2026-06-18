-- =====================================================================
-- ETAPA "COLETA DE DADOS" (type = 'collect')
--
-- COMO USAR:
-- No Supabase: SQL Editor > New query > cole TUDO > Run.
-- Pode rodar mais de uma vez sem problema (usa "if not exists").
--
-- O que faz:
--   - steps.next_step_id: link único de avanço (a etapa de coleta não tem
--     botões; ela segue para UMA próxima etapa).
--   - leads.email: novo dado de contato coletado no formulário.
--   - Índice único por sessão: garante 1 lead por visita (upsert).
--   - Tabela step_fields: os campos do formulário de cada etapa de coleta.
-- =====================================================================

-- 1) Link de avanço das etapas lineares (coleta).
alter table steps
  add column if not exists next_step_id uuid references steps(id) on delete set null;

-- 2) Novo dado de contato no lead.
alter table leads
  add column if not exists email text;

-- 3) Um lead por (jornada + sessão) — permite o upsert no envio do formulário.
--    Antes do índice único, remove duplicados antigos (mantém o mais recente),
--    para o "create unique index" não falhar com dados já existentes.
delete from leads l
using leads newer
where l.session_id is not null
  and newer.journey_id = l.journey_id
  and newer.session_id = l.session_id
  and (newer.created_at > l.created_at
       or (newer.created_at = l.created_at and newer.id > l.id));

-- Índice NÃO-parcial (o Postgres trata NULLs como distintos, então leads
-- antigos sem session_id continuam permitidos) — necessário como alvo do
-- "on conflict (journey_id, session_id)" do upsert.
create unique index if not exists leads_journey_session_uidx
  on leads(journey_id, session_id);

-- 4) Campos do formulário de coleta (espelha a tabela "options").
--    kind: 'full_name' | 'email' | 'whatsapp' | 'custom'
create table if not exists step_fields (
  id          uuid primary key default gen_random_uuid(),
  step_id     uuid not null references steps(id) on delete cascade,
  kind        text not null,
  label       text not null,
  required    boolean not null default true,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_step_fields_step on step_fields(step_id);

-- 5) Segurança (RLS) — mesmas regras dos "options".
alter table step_fields enable row level security;

drop policy if exists "admin gerencia campos" on step_fields;
create policy "admin gerencia campos" on step_fields
  for all using (
    step_id in (
      select s.id from steps s
      join journeys j on j.id = s.journey_id
      where j.company_id = auth_company_id()
    )
  )
  with check (
    step_id in (
      select s.id from steps s
      join journeys j on j.id = s.journey_id
      where j.company_id = auth_company_id()
    )
  );

drop policy if exists "publico le campos publicados" on step_fields;
create policy "publico le campos publicados" on step_fields
  for select using (
    step_id in (
      select s.id from steps s
      join journeys j on j.id = s.journey_id
      where j.status = 'published'
    )
  );
