-- =====================================================================
-- MIGRAÇÃO: configurações do WIDGET (preview flutuante no site do cliente)
--
-- COMO USAR:
-- 1. No Supabase, abra "SQL Editor" > "New query".
-- 2. Cole TODO este arquivo e clique em "Run".
--
-- É seguro rodar mais de uma vez (usa "IF NOT EXISTS"). Os valores padrão
-- reproduzem o visual sugerido (retangular, com borda, no canto direito).
-- =====================================================================

-- Formato da bolha de preview que aparece no canto do site do cliente.
alter table journeys add column if not exists widget_format   text    not null default 'rectangle'; -- 'square' | 'rectangle' | 'circle'
alter table journeys add column if not exists widget_border   boolean not null default true;        -- mostrar borda ao redor da bolha
alter table journeys add column if not exists widget_position  text    not null default 'right';     -- 'right' | 'left' (canto inferior)
