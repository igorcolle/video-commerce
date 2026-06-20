-- =====================================================================
-- BOTÕES DE AÇÃO DO PRODUTO (aba "Ações") + posicionamento nos vídeos
--
-- 1) products.action_buttons  → catálogo de botões de ação cadastrados no
--    produto (cor, opacidade, ícone, textos e tipo: custom/whatsapp/
--    produto/formulário). Estrutura JSON (array de ProductAction).
--
-- 2) product_videos.buttons   → quando cada botão aparece NAQUELE vídeo.
--    Array de { actionId, start, end } (segundos).
--
-- COMO USAR:
--   1. No Supabase, abra "SQL Editor" > "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. É idempotente (pode rodar de novo sem erro).
-- =====================================================================

alter table products
  add column if not exists action_buttons jsonb not null default '[]'::jsonb;

alter table product_videos
  add column if not exists buttons jsonb not null default '[]'::jsonb;
