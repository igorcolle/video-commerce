-- =====================================================================
-- MIGRAÇÃO — posições dos blocos no flow builder (editor de jornadas).
--
-- COMO USAR:
-- No Supabase: SQL Editor > New query > cole TUDO > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- O que faz: adiciona 2 colunas opcionais em "steps" para guardar onde
-- cada bloco fica no canvas do editor. NÃO altera nada existente.
-- =====================================================================

alter table steps add column if not exists pos_x double precision;
alter table steps add column if not exists pos_y double precision;
