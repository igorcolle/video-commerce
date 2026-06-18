-- =====================================================================
-- PLATAFORMA DE JORNADAS INTERATIVAS EM VÍDEO
-- Esquema do banco de dados (Postgres / Supabase)
--
-- COMO USAR:
-- 1. No Supabase, abra "SQL Editor" > "New query".
-- 2. Cole TODO este arquivo e clique em "Run".
-- 3. Depois siga as instruções da seção SEED no final.
-- =====================================================================


-- =====================================================================
-- 1) TABELAS
-- =====================================================================

-- Empresas que usam a plataforma (base da multiempresa)
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Liga um usuário do Supabase Auth a uma empresa
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid references companies(id) on delete cascade,
  full_name   text,
  role        text not null default 'admin',
  created_at  timestamptz not null default now()
);

-- Jornadas
create table journeys (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  slug          text unique,                       -- usado na URL pública: /j/<slug>
  status        text not null default 'draft',     -- 'draft' | 'published'
  start_step_id uuid,                              -- 1ª etapa (FK adicionada mais abaixo)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Etapas: cada vídeo/pergunta OU uma tela de resultado
create table steps (
  id            uuid primary key default gen_random_uuid(),
  journey_id    uuid not null references journeys(id) on delete cascade,
  type          text not null default 'question',  -- 'question' | 'result'
  title         text,
  question_text text,                              -- texto da pergunta exibida
  video_url     text,                              -- link do vídeo (Cloudflare/Bunny)
  position      int  not null default 0,           -- ordem no editor
  -- Estilo uniforme dos botões desta etapa (aplicado a todos os botões da pergunta)
  buttons_layout    text not null default 'stack',   -- 'stack' | 'grid'
  button_template   text not null default 'solid',   -- 'solid' | 'glass' | 'outline' | 'soft'
  button_color      text not null default '#ffffff', -- cor de fundo (hex)
  button_opacity    int  not null default 90,         -- 0 a 100
  button_font_color text not null default '#111827', -- cor do texto (hex)
  button_font            text    not null default 'inter',  -- fonte: inter|roboto|poppins|montserrat|lato
  button_border_color    text    not null default '',       -- cor da borda (vazio = sem borda extra)
  button_shadow          text    not null default 'md',     -- sombra: none|sm|md|lg|glow
  buttons_reveal_enabled boolean not null default false,    -- começar minimizado e revelar perto do fim
  buttons_reveal_seconds int     not null default 5,        -- expandir quando faltar X segundos
  question_position      text    not null default 'top',    -- posição da pergunta: top|center|bottom
  created_at    timestamptz not null default now()
);

-- Botões de decisão de uma etapa. next_step_id = A RAMIFICAÇÃO.
create table options (
  id           uuid primary key default gen_random_uuid(),
  step_id      uuid not null references steps(id) on delete cascade,
  label        text not null,                      -- texto em DESTAQUE do botão (ex: "Chácara")
  subtitle     text,                               -- texto secundário (ex: "Uso médio e frequente")
  icon         text,                               -- emoji opcional (ex: 🏠). null = sem ícone
  next_step_id uuid references steps(id) on delete set null,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

-- Produtos recomendados
create table products (
  id          uuid primary key default gen_random_uuid(),
  journey_id  uuid not null references journeys(id) on delete cascade,
  name        text not null,
  photo_url   text,
  benefits    text,
  buy_link    text,
  whatsapp    text,                                -- número para o botão wa.me
  created_at  timestamptz not null default now()
);

-- Quais produtos aparecem numa etapa de resultado
create table step_products (
  step_id     uuid not null references steps(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  position    int  not null default 0,
  primary key (step_id, product_id)
);

-- Lead qualificado gerado ao final da jornada
create table leads (
  id                   uuid primary key default gen_random_uuid(),
  journey_id           uuid not null references journeys(id) on delete cascade,
  company_id           uuid not null references companies(id) on delete cascade,
  session_id           uuid,                       -- liga o lead à sessão de navegação
  name                 text,
  whatsapp             text,
  answers              jsonb,                      -- {"uso":"Chácara","area":"2000-5000"}
  recommended_products jsonb,                      -- ids/nomes dos produtos sugeridos
  cta_clicked          text,                       -- 'whatsapp' | 'buy' | 'consultor'
  created_at           timestamptz not null default now()
);

-- Cada ação do visitante — esta tabela alimenta TODO o dashboard
create table events (
  id          uuid primary key default gen_random_uuid(),
  journey_id  uuid not null references journeys(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  session_id  uuid not null,                       -- identifica uma visita/sessão
  step_id     uuid references steps(id) on delete set null,
  option_id   uuid references options(id) on delete set null,
  event_type  text not null,                       -- start | view_step | click_option
                                                   -- | click_whatsapp | click_buy | complete
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- FK circular (journeys aponta para a etapa inicial). Criada agora que steps existe.
alter table journeys
  add constraint journeys_start_step_fk
  foreign key (start_step_id) references steps(id) on delete set null;


-- =====================================================================
-- 2) ÍNDICES (deixam as consultas e o dashboard rápidos)
-- =====================================================================
create index idx_steps_journey   on steps(journey_id);
create index idx_options_step    on options(step_id);
create index idx_products_journey on products(journey_id);
create index idx_leads_journey   on leads(journey_id);
create index idx_leads_company   on leads(company_id);
create index idx_events_journey  on events(journey_id);
create index idx_events_company  on events(company_id);
create index idx_events_session  on events(session_id);
create index idx_events_type     on events(event_type);
create index idx_events_created  on events(created_at);


-- =====================================================================
-- 3) SEGURANÇA (Row Level Security)
-- Regra geral:
--   - Visitante anônimo: LÊ jornadas publicadas e ESCREVE events/leads.
--   - Admin logado: gerencia tudo da SUA empresa e LÊ seus leads/eventos.
-- =====================================================================

alter table companies     enable row level security;
alter table profiles      enable row level security;
alter table journeys      enable row level security;
alter table steps         enable row level security;
alter table options       enable row level security;
alter table products      enable row level security;
alter table step_products enable row level security;
alter table leads         enable row level security;
alter table events        enable row level security;

-- Função auxiliar: retorna a empresa do usuário logado
create or replace function auth_company_id()
returns uuid
language sql
stable
as $$
  select company_id from profiles where id = auth.uid()
$$;

-- PROFILES / COMPANIES
create policy "ler proprio profile" on profiles
  for select using (id = auth.uid());

create policy "ler propria empresa" on companies
  for select using (id = auth_company_id());

-- JOURNEYS
create policy "admin gerencia jornadas" on journeys
  for all  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

create policy "publico le jornadas publicadas" on journeys
  for select using (status = 'published');

-- STEPS
create policy "admin gerencia etapas" on steps
  for all using (
    journey_id in (select id from journeys where company_id = auth_company_id())
  )
  with check (
    journey_id in (select id from journeys where company_id = auth_company_id())
  );

create policy "publico le etapas publicadas" on steps
  for select using (
    journey_id in (select id from journeys where status = 'published')
  );

-- OPTIONS
create policy "admin gerencia botoes" on options
  for all using (
    step_id in (
      select s.id from steps s
      join journeys j on j.id = s.journey_id
      where j.company_id = auth_company_id()
    )
  )
  with check (
    step_id in (
      select s.id from steps s
      join journeys j on j.id = s.journey_id
      where j.company_id = auth_company_id()
    )
  );

create policy "publico le botoes publicados" on options
  for select using (
    step_id in (
      select s.id from steps s
      join journeys j on j.id = s.journey_id
      where j.status = 'published'
    )
  );

-- PRODUCTS
create policy "admin gerencia produtos" on products
  for all  using (journey_id in (select id from journeys where company_id = auth_company_id()))
  with check (journey_id in (select id from journeys where company_id = auth_company_id()));

create policy "publico le produtos publicados" on products
  for select using (journey_id in (select id from journeys where status = 'published'));

-- STEP_PRODUCTS
create policy "admin gerencia step_products" on step_products
  for all using (
    step_id in (
      select s.id from steps s join journeys j on j.id = s.journey_id
      where j.company_id = auth_company_id()
    )
  )
  with check (
    step_id in (
      select s.id from steps s join journeys j on j.id = s.journey_id
      where j.company_id = auth_company_id()
    )
  );

create policy "publico le step_products publicados" on step_products
  for select using (
    step_id in (
      select s.id from steps s join journeys j on j.id = s.journey_id
      where j.status = 'published'
    )
  );

-- LEADS  (o player cria; o admin lê)
create policy "publico cria leads" on leads
  for insert with check (true);

create policy "admin le leads" on leads
  for select using (company_id = auth_company_id());

-- EVENTS  (o player registra; o admin lê)
create policy "publico registra eventos" on events
  for insert with check (true);

create policy "admin le eventos" on events
  for select using (company_id = auth_company_id());


-- =====================================================================
-- 4) SEED (dados iniciais)
-- =====================================================================

-- Cria sua primeira empresa
insert into companies (name) values ('Minha Empresa');

-- DEPOIS de rodar tudo acima:
-- 1. No Supabase: Authentication > Users > "Add user" (crie seu login de admin).
-- 2. Pegue o ID do usuário criado e o ID da empresa (rode: select id, name from companies;).
-- 3. Rode o comando abaixo trocando os dois UUIDs:
--
-- insert into profiles (id, company_id, full_name)
-- values ('COLE_O_USER_ID_AQUI', 'COLE_O_COMPANY_ID_AQUI', 'Seu Nome');
