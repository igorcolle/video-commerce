-- =====================================================================
-- ORDENAÇÃO DE PRODUTOS (drag-n-drop)
--
-- Adiciona uma coluna "position" aos produtos para que a empresa possa
-- definir a ordem em que eles aparecem (no admin e no player). As
-- categorias já têm "position" (ver supabase_products_library.sql).
--
-- COMO USAR:
--   1. No Supabase, abra "SQL Editor" > "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. É idempotente (pode rodar de novo sem erro).
-- =====================================================================

-- Posição do produto dentro da sua categoria (0 = primeiro).
alter table products add column if not exists position int not null default 0;

-- Backfill: numera os produtos existentes por categoria, na ordem atual
-- (created_at), para que comecem com posições distintas. Só roda uma vez de
-- forma útil; rodar de novo apenas reorganiza pelos mesmos critérios.
with ordenados as (
  select
    id,
    row_number() over (
      partition by company_id, category_id
      order by created_at
    ) - 1 as rn
  from products
)
update products p
   set position = o.rn
  from ordenados o
 where p.id = o.id
   and p.position = 0;

create index if not exists idx_products_position on products(company_id, category_id, position);
