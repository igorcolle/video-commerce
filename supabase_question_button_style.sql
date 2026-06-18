-- =====================================================================
-- MIGRAÇÃO: estilo da pergunta + tamanho do texto dos botões
--
-- COMO USAR:
-- 1. No Supabase, abra "SQL Editor" > "New query".
-- 2. Cole TODO este arquivo e clique em "Run".
--
-- É seguro rodar mais de uma vez (usa "IF NOT EXISTS"). Os valores padrão
-- reproduzem o visual atual (pergunta branca sobre fundo preto translúcido),
-- então jornadas já existentes continuam com a mesma aparência.
-- =====================================================================

-- ---- Estilo da PERGUNTA (por etapa, tabela steps) -------------------
alter table steps add column if not exists question_font_size  text    not null default 'md';      -- 'sm'|'md'|'lg'|'xl'
alter table steps add column if not exists question_font_color text    not null default '#ffffff'; -- cor da fonte da pergunta (hex)
alter table steps add column if not exists question_bg_enabled  boolean not null default true;      -- mostrar fundo atrás da pergunta
alter table steps add column if not exists question_bg_color    text    not null default '#000000'; -- cor do fundo (aplicada com leve opacidade)

-- ---- Tamanho do texto dos BOTÕES (por etapa, tabela steps) ----------
alter table steps add column if not exists button_text_size    text    not null default 'md';      -- 'sm'|'md'|'lg'
