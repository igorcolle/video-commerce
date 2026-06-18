-- =====================================================================
-- STORAGE — cria o "depósito" de imagens (bucket) e suas permissões.
--
-- COMO USAR:
-- No Supabase: SQL Editor > New query > cole TUDO > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- O que faz:
--   - Cria o bucket público "images" (as imagens dos botões ficam acessíveis por link).
--   - Qualquer pessoa pode VER (leitura pública).
--   - Só usuários logados (admin) podem ENVIAR/trocar/excluir imagens.
-- =====================================================================

-- 1) Cria (ou atualiza) o bucket "images" como público.
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- 2) Permissões (policies) sobre os arquivos do bucket "images".
--    Apaga antes (se existir) para poder rodar de novo sem erro.

drop policy if exists "images leitura publica" on storage.objects;
create policy "images leitura publica"
  on storage.objects for select
  using (bucket_id = 'images');

drop policy if exists "images upload autenticado" on storage.objects;
create policy "images upload autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images');

drop policy if exists "images update autenticado" on storage.objects;
create policy "images update autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'images');

drop policy if exists "images delete autenticado" on storage.objects;
create policy "images delete autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images');
