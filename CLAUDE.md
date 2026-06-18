# Plataforma de Jornadas Interativas em Vídeo

## O que é este projeto
Plataforma onde empresas criam **jornadas de venda interativas em vídeo**.
O cliente assiste a vídeos curtos, clica em botões de decisão e é guiado, de forma
ramificada, até uma recomendação de produto e um CTA (geralmente WhatsApp).

Existem **duas experiências** no mesmo app:
1. **Player público** — o cliente final vive a jornada (vídeo + botões + ramificação +
   recomendação + WhatsApp).
2. **Painel admin** — a empresa cria/edita jornadas e analisa os resultados
   (funil, abandono por etapa, cliques, leads gerados).

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth + Storage)
- Tailwind CSS
- Recharts (gráficos do dashboard)
- Hospedagem de vídeo: Cloudflare Stream ou Bunny (o link fica em `steps.video_url`)
- WhatsApp via links `wa.me` (sem API paga)
- Deploy na Vercel

## Estrutura de pastas (alvo)
```
app/
  (public)/j/[slug]/page.tsx   # player da jornada (URL pública)
  admin/                       # painel (protegido por login)
    jornadas/                  # lista + editor de jornadas
    dashboard/                 # análise de resultados
  api/
    events/route.ts            # registra eventos do player
    leads/route.ts             # cria leads
lib/supabase.ts                # clientes supabase (browser e server)
components/
```

## Modelo de dados (resumo — detalhes em supabase_schema.sql)
- **companies** — empresas que usam a plataforma (multiempresa).
- **profiles** — liga um usuário (Supabase Auth) a uma empresa.
- **journeys** — jornada (name, slug, status `draft`/`published`, start_step_id).
- **steps** — etapas: cada vídeo/pergunta ou tela de resultado.
- **options** — botões de decisão. O campo `next_step_id` é o que cria a RAMIFICAÇÃO.
- **products** — produtos recomendados (foto, benefícios, link de compra, whatsapp).
- **step_products** — quais produtos aparecem em cada etapa de resultado.
- **leads** — lead qualificado (respostas dadas, produtos sugeridos, CTA clicado).
- **events** — cada ação do visitante. É O QUE ALIMENTA O DASHBOARD.

## Regras de negócio
- Cada jornada deve ter de **3 a 5 decisões** principais (jornada curta converte mais).
- Vídeos curtos (10–30s); uma pergunta por etapa.
- A ramificação acontece SEMPRE via `options.next_step_id`.
- O player grava em `events` a cada ação: `start`, `view_step`, `click_option`,
  `click_whatsapp`, `click_buy`, `complete`.
- Ao final (ou no clique de CTA) o player cria um registro em `leads`.
- A `session_id` (gerada no navegador) liga todos os eventos de uma mesma visita.
- O dashboard é montado agregando a tabela `events`.
- Dados pessoais de lead (nome, WhatsApp) → tratar com cuidado (LGPD no Brasil).

## Variáveis de ambiente (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`  (somente no servidor; NUNCA expor no client)
(As chaves do provedor de vídeo entram numa fase posterior.)

## Como trabalhar neste projeto (instruções para o Claude Code)
- Construa em **passos pequenos e testáveis**, na ordem da seção "Fase atual".
- Antes de mudanças grandes ou que apaguem dados, **explique o plano e peça confirmação**.
- Faça cada tela simples e funcional primeiro; estética depois.
- Use componentes pequenos e reutilizáveis.
- Comente em português os trechos não óbvios.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no lado do cliente.
- Ao terminar uma etapa, explique **como testá-la**.
- O dono do projeto é leigo: explique decisões em linguagem simples.

## Fase atual
Ordem de construção (marque conforme concluir):
1. [x] Projeto Next.js + Tailwind + Supabase conectados. (Deploy na Vercel: pendente.)
2. [x] Aplicar `supabase_schema.sql` no Supabase. (+ `supabase_seed_rocadeira.sql` e `supabase_storage_setup.sql`.)
3. [x] Player com UMA jornada fixa (roçadeira): vídeo + botões + ramificação + `wa.me`.
4. [x] Registro de eventos no player.
5. [x] Login do admin + CRUD de jornadas/etapas/botões/produtos.
6. [x] Upload de vídeos. (Via Supabase Storage, bucket `videos`.)
7. [ ] Dashboard de análise (gráficos). ← PRÓXIMA FASE
8. [ ] Multiempresa + cobrança (fase SaaS).
