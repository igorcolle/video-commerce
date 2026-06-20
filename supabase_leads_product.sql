-- =====================================================================
-- LEADS A PARTIR DO PLAYER DE PRODUTO (sem jornada)
--
-- O player de produto (/p/<id>) não tem jornada. Para registrar leads de
-- formulários de botões de ação, a tabela leads passa a aceitar:
--   - journey_id NULO (deixa de ser obrigatório);
--   - product_id  (de qual produto veio o lead).
-- Assim o lead aparece na página /admin/leads com origem = nome do produto.
--
-- COMO USAR:
--   1. No Supabase, abra "SQL Editor" > "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. É idempotente (pode rodar de novo sem erro).
-- =====================================================================

-- 1) journey_id deixa de ser obrigatório.
alter table leads alter column journey_id drop not null;

-- 2) Liga o lead ao produto de origem.
alter table leads
  add column if not exists product_id uuid references products(id) on delete set null;

create index if not exists idx_leads_product on leads(product_id);

-- 3) Índice único para upsert por (product_id, session_id) — 1 lead por visita
--    de um mesmo produto. Não é parcial (para o ON CONFLICT inferir o índice);
--    leads de jornada têm product_id NULO e, como NULLs são distintos num
--    índice único, nunca colidem entre si.
create unique index if not exists leads_product_session_uidx
  on leads(product_id, session_id);

-- 4) RLS: a empresa também pode LER os leads dos seus produtos (a policy
--    atual só enxerga leads via journey_id). A inserção continua pela rota
--    /api/leads com a chave service_role (que ignora o RLS).
drop policy if exists leads_select_product on leads;
create policy leads_select_product on leads
  for select using (
    product_id in (select id from products where company_id = auth_company_id())
  );
