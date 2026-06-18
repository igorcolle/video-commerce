-- =====================================================================
-- WIDGET — novos ajustes: TAMANHO e COR DA BORDA da bolha.
--
-- COMO USAR:
-- No Supabase: SQL Editor > New query > cole TUDO > Run.
-- Pode rodar mais de uma vez sem problema (usa "if not exists").
--
-- O que faz:
--   - widget_size: tamanho da bolha em % (50 a 150), padrão 100.
--   - widget_border_color: cor da borda da bolha, padrão branco.
-- =====================================================================

alter table journeys
  add column if not exists widget_size int not null default 100;

alter table journeys
  add column if not exists widget_border_color text not null default '#ffffff';
