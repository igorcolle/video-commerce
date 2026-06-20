-- =====================================================================
-- BIBLIOTECA DE PRODUTOS (produtos reutilizáveis por empresa)
--
-- O QUE MUDA:
--   Antes: cada produto pertencia a UMA jornada (products.journey_id).
--   Agora: o produto pertence à EMPRESA (products.company_id) e pode ser
--          usado em várias jornadas. As jornadas continuam ligando produtos
--          às etapas de resultado via "step_products" (sem mudança lá).
--
-- NOVIDADES:
--   - product_categories : pastas para agrupar produtos (Roçadeiras, etc.)
--   - products.tag/tag_color, summary, description, status, specs
--   - product_specs       : tabela de atributos (2 colunas: atributo/valor)
--   - product_videos      : vídeos do produto + destaques (stories)
--
-- COMO USAR:
--   1. No Supabase, abra "SQL Editor" > "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. É idempotente (pode rodar de novo sem erro).
-- =====================================================================


-- =====================================================================
-- 1) CATEGORIAS (pastas) — pertencem à empresa
-- =====================================================================
create table if not exists product_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- 2) PRODUTOS — passam a ser da empresa (biblioteca)
-- =====================================================================
-- Novas colunas (todas opcionais p/ não quebrar dados existentes).
alter table products add column if not exists company_id   uuid references companies(id) on delete cascade;
alter table products add column if not exists category_id  uuid references product_categories(id) on delete set null;
alter table products add column if not exists tag          text;
alter table products add column if not exists tag_color    text;
alter table products add column if not exists summary      text;   -- "Resumo"
alter table products add column if not exists description  text;   -- "Descrição Ampla"
alter table products add column if not exists status       text not null default 'draft';  -- 'draft' | 'published'
alter table products add column if not exists specs_enabled  boolean not null default false;
alter table products add column if not exists specs_summary  text;

-- Migra os produtos existentes para a empresa da jornada a que pertenciam.
update products p
   set company_id = j.company_id
  from journeys j
 where p.journey_id = j.id
   and p.company_id is null;

-- journey_id deixa de ser obrigatório (produto vive sem jornada na biblioteca).
alter table products alter column journey_id drop not null;


-- =====================================================================
-- 3) ESPECIFICAÇÕES (tabela de atributos: 2 colunas)
-- =====================================================================
create table if not exists product_specs (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  attribute   text not null,
  value       text,
  position    int  not null default 0
);


-- =====================================================================
-- 4) VÍDEOS / DESTAQUES (stories) do produto
-- =====================================================================
create table if not exists product_videos (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  title        text,                              -- nome do destaque/vídeo
  video_url    text not null,
  thumb_url    text,
  is_main      boolean not null default false,    -- "Vídeo Principal"
  is_highlight boolean not null default true,     -- aparece como bolinha/destaque no player
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);


-- =====================================================================
-- 5) ÍNDICES
-- =====================================================================
create index if not exists idx_products_company           on products(company_id);
create index if not exists idx_products_category          on products(category_id);
create index if not exists idx_product_categories_company on product_categories(company_id);
create index if not exists idx_product_specs_product      on product_specs(product_id);
create index if not exists idx_product_videos_product     on product_videos(product_id);


-- =====================================================================
-- 6) SEGURANÇA (RLS)
--   - Admin gerencia tudo da SUA empresa.
--   - Visitante anônimo lê apenas produtos ligados a jornadas publicadas.
-- =====================================================================
alter table product_categories enable row level security;
alter table product_specs       enable row level security;
alter table product_videos      enable row level security;

-- PRODUCTS: troca as policies antigas (eram baseadas em journey_id).
drop policy if exists "admin gerencia produtos"     on products;
drop policy if exists "publico le produtos publicados" on products;

create policy "admin gerencia produtos" on products
  for all  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- Público lê o produto se ele aparece em alguma etapa de jornada publicada.
create policy "publico le produtos publicados" on products
  for select using (
    id in (
      select sp.product_id from step_products sp
      join steps s   on s.id = sp.step_id
      join journeys j on j.id = s.journey_id
      where j.status = 'published'
    )
  );

-- PRODUCT_CATEGORIES
drop policy if exists "admin gerencia categorias" on product_categories;
create policy "admin gerencia categorias" on product_categories
  for all  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- PRODUCT_SPECS (admin: via empresa do produto; público: produto publicado)
drop policy if exists "admin gerencia specs"  on product_specs;
drop policy if exists "publico le specs"      on product_specs;
create policy "admin gerencia specs" on product_specs
  for all using (
    product_id in (select id from products where company_id = auth_company_id())
  )
  with check (
    product_id in (select id from products where company_id = auth_company_id())
  );
create policy "publico le specs" on product_specs
  for select using (
    product_id in (
      select sp.product_id from step_products sp
      join steps s   on s.id = sp.step_id
      join journeys j on j.id = s.journey_id
      where j.status = 'published'
    )
  );

-- PRODUCT_VIDEOS (mesma lógica das specs)
drop policy if exists "admin gerencia videos"  on product_videos;
drop policy if exists "publico le videos"       on product_videos;
create policy "admin gerencia videos" on product_videos
  for all using (
    product_id in (select id from products where company_id = auth_company_id())
  )
  with check (
    product_id in (select id from products where company_id = auth_company_id())
  );
create policy "publico le videos" on product_videos
  for select using (
    product_id in (
      select sp.product_id from step_products sp
      join steps s   on s.id = sp.step_id
      join journeys j on j.id = s.journey_id
      where j.status = 'published'
    )
  );
