-- =====================================================================
-- STORAGE — cria o "depósito" de vídeos (bucket) e suas permissões.
--
-- COMO USAR:
-- No Supabase: SQL Editor > New query > cole TUDO > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- O que faz:
--   - Cria o bucket público "videos" (os vídeos ficam acessíveis por link).
--   - Qualquer pessoa pode ASSISTIR (leitura pública).
--   - Só usuários logados (admin) podem ENVIAR/trocar/excluir vídeos.
-- =====================================================================

-- 1) Cria (ou atualiza) o bucket "videos" como público.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update set public = true;

-- 2) Permissões (policies) sobre os arquivos do bucket "videos".
--    Apaga antes (se existir) para poder rodar de novo sem erro.

drop policy if exists "videos leitura publica" on storage.objects;
create policy "videos leitura publica"
  on storage.objects for select
  using (bucket_id = 'videos');

drop policy if exists "videos upload autenticado" on storage.objects;
create policy "videos upload autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'videos');

drop policy if exists "videos update autenticado" on storage.objects;
create policy "videos update autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'videos');

drop policy if exists "videos delete autenticado" on storage.objects;
create policy "videos delete autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'videos');
