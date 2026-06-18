# Video Commerce — Jornadas Interativas em Vídeo

Plataforma onde empresas criam **jornadas de venda interativas em vídeo**. O
cliente assiste a vídeos curtos, clica em botões de decisão e é guiado, de forma
ramificada, até uma recomendação de produto e um CTA (geralmente WhatsApp).

Duas experiências no mesmo app:

1. **Player público** — o cliente final vive a jornada (vídeo vertical 9:16 +
   botões + ramificação + recomendação + WhatsApp).
2. **Painel admin** — a empresa cria/edita jornadas (flow builder) e analisa os
   resultados.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth + Storage)
- Tailwind CSS
- Compressão de vídeo no envio via ffmpeg (WebAssembly)
- WhatsApp via links `wa.me`
- Deploy na Vercel

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Veja `.env.example` e o passo a passo em `SETUP_SUPABASE.md`. As chaves reais
ficam em `.env.local` (que **não** é versionado). Nunca exponha
`SUPABASE_SERVICE_ROLE_KEY` no lado do cliente.

## Banco de dados

Os scripts `supabase_*.sql` criam o schema, o storage e dados de exemplo. Rode-os
no SQL Editor do Supabase (detalhes em `SETUP_SUPABASE.md`).
