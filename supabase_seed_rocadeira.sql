-- =====================================================================
-- SEED — Jornada de demonstração "Escolha sua roçadeira STIHL"
--
-- COMO USAR:
-- 1. Rode ANTES o arquivo supabase_schema.sql (cria as tabelas + 1 empresa).
-- 2. No Supabase: SQL Editor > New query > cole TODO este arquivo > Run.
-- 3. Abra o player em /j/rocadeira (local ou na Vercel).
--
-- Pode rodar este arquivo quantas vezes quiser: ele apaga e recria a
-- jornada "rocadeira" do zero (não duplica).
--
-- OBS.: os vídeos abaixo são EXEMPLOS públicos. Depois troque cada
-- steps.video_url pelos seus vídeos reais (Cloudflare Stream / Bunny).
-- E troque o número de WhatsApp dos produtos pelo número real da empresa.
-- =====================================================================

-- Apaga a jornada anterior (se existir). O "on delete cascade" remove
-- etapas, opções, produtos e step_products ligados a ela.
delete from journeys where slug = 'rocadeira';

do $$
declare
  v_company  uuid;
  v_journey  uuid;
  -- IDs fixos das etapas (gerados agora para poder ligar a ramificação)
  s_uso      uuid := gen_random_uuid();
  s_area     uuid := gen_random_uuid();
  s_veg      uuid := gen_random_uuid();
  s_motor    uuid := gen_random_uuid();
  s_result   uuid := gen_random_uuid();
  -- IDs dos produtos
  p_fs55     uuid := gen_random_uuid();
  p_fs80     uuid := gen_random_uuid();
  p_fs120    uuid := gen_random_uuid();
  p_fs220    uuid := gen_random_uuid();
  -- Número de WhatsApp da empresa (TROQUE pelo número real, com DDI 55)
  v_whatsapp text := '5562999999999';
begin
  -- Usa a 1ª empresa criada pelo schema. Se não houver, cria uma.
  select id into v_company from companies order by created_at limit 1;
  if v_company is null then
    insert into companies (name) values ('Minha Empresa') returning id into v_company;
  end if;

  -- Cria a jornada já PUBLICADA (para aparecer no player público).
  insert into journeys (company_id, name, slug, status)
  values (v_company, 'Escolha sua roçadeira STIHL', 'rocadeira', 'published')
  returning id into v_journey;

  -- ETAPAS (4 perguntas + 1 resultado). Vídeos de exemplo (troque depois).
  insert into steps (id, journey_id, type, title, question_text, video_url, position) values
    (s_uso,    v_journey, 'question', 'Uso',       'Você vai usar a roçadeira onde?',
       'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 1),
    (s_area,   v_journey, 'question', 'Área',      'Qual o tamanho da área?',
       'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 2),
    (s_veg,    v_journey, 'question', 'Vegetação', 'Qual tipo de vegetação você precisa cortar?',
       'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 3),
    (s_motor,  v_journey, 'question', 'Motor',     'Você prefere qual tipo de motor?',
       'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 4),
    (s_result, v_journey, 'result',   'Resultado', 'Com base no seu uso, essas são as melhores opções.',
       'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 5);

  -- Define a etapa inicial da jornada.
  update journeys set start_step_id = s_uso where id = v_journey;

  -- OPÇÕES (botões). O next_step_id é o que cria a RAMIFICAÇÃO.
  -- Etapa 1 (Uso): "Jardinagem profissional" pula direto ao resultado
  -- (exemplo de ramificação real; as demais seguem o fluxo normal).
  insert into options (step_id, label, next_step_id, position) values
    (s_uso, 'Casa',                    s_area,   1),
    (s_uso, 'Chácara',                 s_area,   2),
    (s_uso, 'Fazenda',                 s_area,   3),
    (s_uso, 'Jardinagem profissional', s_result, 4);

  -- Etapa 2 (Área) -> Vegetação
  insert into options (step_id, label, next_step_id, position) values
    (s_area, 'Até 500 m²',          s_veg, 1),
    (s_area, 'De 500 a 2.000 m²',   s_veg, 2),
    (s_area, 'De 2.000 a 5.000 m²', s_veg, 3),
    (s_area, 'Acima de 5.000 m²',   s_veg, 4);

  -- Etapa 3 (Vegetação) -> Motor
  insert into options (step_id, label, next_step_id, position) values
    (s_veg, 'Grama baixa', s_motor, 1),
    (s_veg, 'Capim médio', s_motor, 2),
    (s_veg, 'Capim alto',  s_motor, 3),
    (s_veg, 'Mato pesado', s_motor, 4);

  -- Etapa 4 (Motor) -> Resultado
  insert into options (step_id, label, next_step_id, position) values
    (s_motor, 'Gasolina',           s_result, 1),
    (s_motor, 'Bateria',            s_result, 2),
    (s_motor, 'Elétrico',           s_result, 3),
    (s_motor, 'Quero recomendação', s_result, 4);

  -- PRODUTOS recomendados (fotos de exemplo via placehold.co).
  insert into products (id, journey_id, name, photo_url, benefits, buy_link, whatsapp) values
    (p_fs55,  v_journey, 'STIHL FS 55',
       'https://placehold.co/600x400?text=FS+55',
       'Leve e ágil. Ideal para grama baixa e áreas pequenas em casa.',
       'https://www.stihl.com.br/', v_whatsapp),
    (p_fs80,  v_journey, 'STIHL FS 80',
       'https://placehold.co/600x400?text=FS+80',
       'Equilíbrio entre potência e peso. Boa para chácaras e capim médio.',
       'https://www.stihl.com.br/', v_whatsapp),
    (p_fs120, v_journey, 'STIHL FS 120',
       'https://placehold.co/600x400?text=FS+120',
       'Mais potência para áreas grandes e capim alto.',
       'https://www.stihl.com.br/', v_whatsapp),
    (p_fs220, v_journey, 'STIHL FS 220',
       'https://placehold.co/600x400?text=FS+220',
       'Profissional. Encara mato pesado e uso intenso em fazendas.',
       'https://www.stihl.com.br/', v_whatsapp);

  -- Quais produtos aparecem na etapa de RESULTADO (e em que ordem).
  insert into step_products (step_id, product_id, position) values
    (s_result, p_fs55,  1),
    (s_result, p_fs80,  2),
    (s_result, p_fs120, 3),
    (s_result, p_fs220, 4);
end $$;
