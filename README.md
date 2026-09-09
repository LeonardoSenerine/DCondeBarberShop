# D'Conde Barbearia

Site da D'Conde Barbearia (Itatiba/SP): landing page, agendamento online, área
do cliente e painel administrativo. Construído com **Vite + React + TypeScript**,
**Tailwind CSS v4** e **Supabase** (Postgres + Auth por e-mail + Storage) como
banco de dados.

## Stack

- **Vite + React 19 + TypeScript** — base do app.
- **Tailwind CSS v4** (`@tailwindcss/vite`) para os estilos utilitários, com
  tokens de marca (cores, fontes, animações) definidos em `src/styles/globals.css`.
- CSS específico que não cabe em utilitários (scroll rails, hover de galeria,
  clamp de texto) fica em arquivos próprios: `src/styles/scroll-rails.css` e
  `src/styles/gallery-card.css`.
- **Supabase** como banco de dados: Postgres com RLS, autenticação de clientes
  por e-mail (código OTP, sem custo — usa o e-mail embutido do Supabase) e
  Storage para as fotos da galeria/produtos.
- **react-router-dom** para as rotas `/` (site), `/conta` (área do cliente) e
  `/admin` (painel da barbearia).

## Estrutura

```
src/
  components/        seções do site (Hero, BookingWizard, Shop, ...)
  components/admin/  abas do painel administrativo
  pages/             SitePage, AccountPage, AdminPage
  context/           AuthContext (sessão/perfil) e CartContext (carrinho)
  hooks/             leitura/escrita no Supabase (catálogo, agendamento, admin)
  lib/               cliente Supabase, formatação (moeda, datas, telefone)
  data/content.ts    textos estáticos do site (não é dado de negócio)
  types/database.ts  espelho manual do schema do Supabase
  styles/            globals.css + CSS específico por componente
supabase/
  schema.sql         tabelas, RLS e buckets de storage
  seed.sql           dados iniciais (serviços, barbeiros, produtos, galeria)
```

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode primeiro `supabase/schema.sql` e depois
   `supabase/seed.sql` (nessa ordem). Os dois são seguros de rodar de novo caso
   precise reaplicar.
3. O login por e-mail já vem ativado por padrão em todo projeto Supabase — não
   precisa configurar nada para o código funcionar. Só confira em
   **Authentication → Email Templates → Magic Link** se o template inclui
   `{{ .Token }}` (é o código de 6 dígitos); se não tiver, adicione algo como
   "Seu código: {{ .Token }}" no corpo do e-mail.
   - O Supabase usa um servidor de e-mail compartilhado com limite baixo
     (poucos e-mails por hora), bom para testar. Para uso real, configure um
     SMTP próprio em **Project Settings → Authentication → SMTP Settings**
     (Resend, Brevo e outros têm planos gratuitos suficientes para uma
     barbearia).
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public
   key** (ou, no formato novo, a **publishable key**, que começa com
   `sb_publishable_...`).
5. Copie `.env.example` para `.env.local` e preencha:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # ou sb_publishable_...
   ```

### Criando o usuário administrador

Qualquer pessoa que faz login pelo site vira `role = 'customer'` automaticamente.
Para acessar `/admin`, promova um usuário depois do primeiro login dele:

```sql
update public.profiles set role = 'admin' where id = '<uuid-do-usuário>';
```

O `uuid` aparece em **Authentication → Users** no painel do Supabase.

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de produção em dist/
npm run lint      # oxlint
```

Sem o `.env.local` configurado, o site funciona normalmente na parte visual,
mas as listas (serviços, barbeiros, galeria, produtos) ficam vazias e o login
não completa, já que não há um Supabase real para conversar.

## Banco de dados

Tabelas principais (ver `supabase/schema.sql` para detalhes e políticas de
RLS):

- `profiles` — clientes e admins (role `customer`/`admin`), criado automaticamente
  no primeiro login via trigger em `auth.users`.
- `barbers`, `barber_hours` — barbeiros e a grade de horários/dias que cada um
  atende (editável pelo painel).
- `services` — serviços, duração e preço.
- `bookings` — agendamentos; a disponibilidade de horário é calculada
  cruzando `barber_hours.slots` com os agendamentos já existentes na data.
- `products`, `orders`, `order_items` — loja e reservas para retirada na loja.
- `gallery_photos` — fotos da galeria, com upload real para o Storage
  (`bucket gallery`) pelo painel administrativo.
- `transactions` — lançamentos financeiros exibidos na aba Financeiro do
  painel.

Todas as tabelas têm Row Level Security: leitura pública para o catálogo
(serviços, barbeiros, galeria, produtos ativos), e escrita restrita a admins
ou ao próprio dono do registro (agendamentos e pedidos do cliente).
