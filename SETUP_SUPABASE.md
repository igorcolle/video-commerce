# Guia passo a passo — Configurar o Supabase (linguagem simples)

O Supabase é o "banco de dados na nuvem" do projeto. Aqui ficam as jornadas,
os eventos e os leads. Siga os passos abaixo na ordem. Leva ~15 minutos.

> Você vai precisar copiar **3 chaves** no final e colá-las no arquivo
> `.env.local` (que já existe na pasta do projeto). Sem isso, o site não conecta.

---

## 1. Criar a conta e o projeto

1. Acesse **https://supabase.com** e clique em **Start your project** (login com GitHub ou e-mail).
2. Clique em **New project**.
3. Preencha:
   - **Name:** `video-commerce` (ou o nome que quiser).
   - **Database Password:** crie uma senha forte e **guarde** (você quase não vai usar, mas guarde).
   - **Region:** escolha **South America (São Paulo)** (mais rápido no Brasil).
4. Clique em **Create new project** e espere ~2 minutos até ficar pronto.

---

## 2. Criar as tabelas (rodar o schema)

1. No menu lateral esquerdo, clique em **SQL Editor**.
2. Clique em **New query** (ou "New snippet").
3. Abra o arquivo **`supabase_schema.sql`** (na pasta do projeto), copie **TODO** o conteúdo e cole no editor.
4. Clique em **Run** (canto inferior direito). Deve aparecer "Success".

> Isso cria todas as tabelas, as regras de segurança e já cria uma empresa chamada "Minha Empresa".

---

## 3. Criar a jornada de demonstração (roçadeira)

1. Ainda no **SQL Editor**, clique em **New query** de novo.
2. Abra o arquivo **`supabase_seed_rocadeira.sql`**, copie **TUDO** e cole.
3. Clique em **Run**. Deve aparecer "Success".

> Isso cria a jornada "Escolha sua roçadeira STIHL" com 4 perguntas + resultado,
> usando **vídeos de exemplo**. Depois você troca pelos seus vídeos reais.

---

## 4. Pegar as 3 chaves

1. No menu lateral, clique no ícone de engrenagem **Project Settings**.
2. Clique em **API** (ou **API Keys**).
3. Você vai ver:
   - **Project URL** → essa é a `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon public** (em "Project API keys") → essa é a `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role** (clique em "Reveal" para mostrar) → essa é a `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ A chave **service_role** é secreta. Nunca poste em prints, e-mails ou no site.

---

## 5. Colar as chaves no projeto

1. Na pasta do projeto, abra o arquivo **`.env.local`**.
2. Preencha as 3 linhas (sem aspas, cole o valor logo após o `=`):

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cole-a-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=cole-a-chave-service-role-aqui
```

3. Salve o arquivo.

---

## 6. Rodar o site

No terminal, dentro da pasta do projeto:

```
npm run dev
```

Abra no navegador:
- **http://localhost:3000** → página inicial ("Projeto no ar ✅").
- **http://localhost:3000/j/rocadeira** → a jornada de demonstração.

Clique nos botões, chegue ao resultado e teste o botão de WhatsApp.

---

## 7. Criar seu login de admin (necessário para o painel)

1. No menu lateral: **Authentication** → **Users** → **Add user**.
2. Preencha **e-mail** e **senha** e confirme (marque "Auto Confirm User" se aparecer).

> Você NÃO precisa mexer em SQL aqui. No seu primeiro acesso ao painel, o sistema
> liga seu usuário automaticamente à empresa que já tem a jornada da roçadeira.

---

## 8. Preparar o upload de vídeos (rodar 1 SQL)

Para poder enviar vídeos pelo painel, precisamos criar o "depósito" de vídeos:

1. No **SQL Editor**, clique em **New query**.
2. Abra o arquivo **`supabase_storage_setup.sql`**, copie **TUDO** e cole.
3. Clique em **Run**. Deve aparecer "Success".

---

## 9. Acessar o painel admin

Com o site rodando (`npm run dev`):

1. Abra **http://localhost:3000/admin/login**.
2. Entre com o e-mail e a senha que você criou no passo 7.
3. Você verá a lista de jornadas (incluindo a roçadeira). Clique em **Editar** para:
   - mudar perguntas e textos,
   - **enviar vídeos** (botão "Enviar vídeo" em cada etapa),
   - criar **botões** e escolher para qual etapa cada um leva (a ramificação),
   - cadastrar **produtos** e marcar quais aparecem no resultado,
   - **Publicar** a jornada.

---

## Depois: trocar vídeos e WhatsApp pelos reais

- **Vídeos:** agora é só usar o botão **"Enviar vídeo"** no editor de cada etapa
  (o link é preenchido sozinho). Se preferir um vídeo já hospedado em outro lugar
  (Cloudflare/Bunny), dá para colar a URL direto na tabela `steps.video_url`.
- **WhatsApp:** no editor, em cada **produto**, preencha o campo WhatsApp com o número
  real (formato com DDI: `5562999999999`).

Pronto! Qualquer dúvida, é só chamar.
