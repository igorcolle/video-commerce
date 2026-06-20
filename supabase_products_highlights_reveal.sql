-- =====================================================================
-- REVELAÇÃO DA BARRA DE DESTAQUES (timing no player do produto)
--
-- Adiciona uma coluna que define, no player do produto, quantos segundos
-- ANTES de o vídeo principal terminar a barra de destaques deve aparecer.
--   0  = a barra aparece desde o início (comportamento padrão).
--   N  = a barra só aparece quando faltarem N segundos para o fim.
--
-- COMO USAR:
--   1. No Supabase, abra "SQL Editor" > "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. É idempotente (pode rodar de novo sem erro).
-- =====================================================================

alter table products
  add column if not exists highlights_reveal_seconds int not null default 0;
