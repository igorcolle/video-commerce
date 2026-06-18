-- =====================================================================
-- BOTÕES CONFIGURÁVEIS DOS PRODUTOS + CTA GERAL DO RESULTADO
--
-- COMO USAR:
-- No Supabase: SQL Editor > New query > cole TUDO > Run.
-- Pode rodar mais de uma vez sem problema (usa "if not exists").
--
-- O que faz:
--   - products.buttons: até 2 botões por produto (WhatsApp ou personalizado).
--     Formato: [{ "kind": "whatsapp"|"custom", "label": "...", "value": "..." }]
--       whatsapp → value = número com DDI (ex.: 5562999999999)
--       custom   → label = nome do botão, value = link
--   - steps.result_cta: 1 botão de ação geral (mesmo formato) na tela de resultado.
--   - Backfill: produtos que já tinham WhatsApp viram 1 botão de WhatsApp,
--     para as jornadas atuais continuarem funcionando.
-- =====================================================================

-- 1) Botões dos produtos.
alter table products
  add column if not exists buttons jsonb not null default '[]'::jsonb;

-- 2) Botão de ação geral (CTA) da etapa de resultado.
alter table steps
  add column if not exists result_cta jsonb;

-- 3) Backfill: migra o WhatsApp antigo para um botão (só onde ainda não há botões).
update products
set buttons = jsonb_build_array(
  jsonb_build_object(
    'kind',  'whatsapp',
    'label', 'Falar no WhatsApp',
    'value', whatsapp
  )
)
where whatsapp is not null
  and btrim(whatsapp) <> ''
  and (buttons is null or buttons = '[]'::jsonb);
