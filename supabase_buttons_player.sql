-- =====================================================================
-- MIGRAÇÃO: botões personalizáveis + player estilo stories
--
-- COMO USAR:
-- 1. No Supabase, abra "SQL Editor" > "New query".
-- 2. Cole TODO este arquivo e clique em "Run".
--
-- É seguro rodar mais de uma vez (usa "IF NOT EXISTS"). Os valores padrão
-- garantem que jornadas já existentes continuem com a aparência atual.
-- =====================================================================

-- ---- Conteúdo por botão (tabela options) ----------------------------
-- O "label" atual passa a ser o TEXTO EM DESTAQUE do botão.
alter table options add column if not exists icon     text;  -- emoji opcional (ex: 🏠). null = sem ícone
alter table options add column if not exists subtitle text;  -- texto secundário (ex: "Uso leve e ocasional")

-- ---- Estilo uniforme dos botões (por etapa, tabela steps) -----------
alter table steps add column if not exists buttons_layout    text    not null default 'stack';   -- 'stack' | 'grid'
alter table steps add column if not exists button_template   text    not null default 'solid';   -- 'solid' | 'glass' | 'outline' | 'soft'
alter table steps add column if not exists button_color      text    not null default '#ffffff'; -- cor de fundo (hex)
alter table steps add column if not exists button_opacity    int     not null default 90;        -- 0 a 100
alter table steps add column if not exists button_font_color text    not null default '#111827'; -- cor do texto (hex)

-- ---- Aprimoramentos de design (Fase 2) ------------------------------
alter table steps add column if not exists button_font            text    not null default 'inter';  -- 'inter'|'roboto'|'poppins'|'montserrat'|'lato'
alter table steps add column if not exists button_border_color    text    not null default '';       -- cor da borda (vazio = sem borda extra)
alter table steps add column if not exists button_shadow          text    not null default 'md';     -- 'none'|'sm'|'md'|'lg'|'glow'
alter table steps add column if not exists buttons_reveal_enabled boolean not null default false;    -- começar minimizado e revelar perto do fim
alter table steps add column if not exists buttons_reveal_seconds int     not null default 5;        -- expandir quando faltar X segundos
alter table steps add column if not exists question_position      text    not null default 'top';    -- 'top'|'center'|'bottom'
