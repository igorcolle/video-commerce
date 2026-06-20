-- =====================================================================
-- CAPTURA DE LEADS
--
-- Permite que um usuário do sistema "capture" um lead: ele sai da aba
-- "Novos Leads" e vai para "Histórico de Leads", registrando QUEM capturou,
-- QUANDO e COMO entrou em contato.
--
-- COMO USAR:
--   1. No Supabase, abra "SQL Editor" > "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. É idempotente (pode rodar de novo sem erro).
-- =====================================================================

-- Novas colunas de captura (todas opcionais).
alter table leads add column if not exists captured_at      timestamptz;
alter table leads add column if not exists captured_by       uuid references auth.users(id);
alter table leads add column if not exists captured_by_name  text;   -- nome do atendente
alter table leads add column if not exists contact_method    text;   -- como entrou em contato

-- Faltava a policy de UPDATE: hoje só há "publico cria leads" (insert) e
-- "admin le leads" (select). Sem isto o admin não consegue capturar.
drop policy if exists "admin atualiza leads" on leads;
create policy "admin atualiza leads" on leads
  for update using (company_id = auth_company_id())
  with check (company_id = auth_company_id());
