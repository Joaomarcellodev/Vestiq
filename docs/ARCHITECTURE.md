# Arquitetura

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Linguagem | TypeScript (`strict`, `noUncheckedIndexedAccess`) |
| UI | Tailwind CSS 3 + Atomic Design + Material Symbols |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Validação | Zod (compartilhada client/server) |
| Testes | Vitest + Testing Library, Playwright |
| CI | GitHub Actions |

## Princípios

1. **SDD** — nenhuma feature começa por código. Ver [`../specs/README.md`](../specs/README.md).
2. **Server-first** — busca de dados em Server Components; mutações em Server Actions.
   Client Components só onde há interatividade real.
3. **RLS é a fronteira de segurança** — a UI nunca é a única barreira. Toda tabela
   de domínio é isolada por organização no banco. Ver [`SECURITY.md`](./SECURITY.md).
4. **Operações críticas são transacionais no banco** — venda e transferência de
   estoque são funções PostgreSQL, não sequências de chamadas no cliente
   ([ADR-0004](./adr/0004-atomic-operations-via-postgres-functions.md)).
5. **Atomic Design** — `atoms → molecules → organisms → templates`. Páginas compõem
   templates e features; regra de negócio não mora na página.

## Estrutura de pastas

```
src/
├── app/                        # App Router — apenas roteamento e composição
│   ├── (app)/                  # grupo autenticado (usa AppShell + requireUser)
│   │   ├── layout.tsx
│   │   └── dashboard/…
│   ├── auth/callback/route.ts  # troca de código OAuth (PKCE)
│   ├── login/page.tsx
│   ├── layout.tsx              # root: fontes, <html lang="pt-BR">
│   └── globals.css
│
├── components/                 # design system, agnóstico de domínio
│   ├── atoms/                  # Button, TextField, Icon, Badge, Checkbox, Spinner, Logo
│   ├── molecules/              # SearchInput, PriceField, StockBadge, FormField…
│   ├── organisms/              # TopAppBar, BottomNav, ProductForm, InventoryTable…
│   └── templates/              # AppShell (DashboardTemplate), AuthTemplate…
│
├── features/                   # um diretório por domínio
│   └── <feature>/
│       ├── actions.ts          # "use server" — Server Actions (mutações)
│       ├── queries.ts          # "server-only" — leitura de dados
│       ├── validation.ts       # schemas Zod + tipos derivados
│       ├── components/         # componentes específicos da feature
│       └── <feature>.test.ts   # testes unitários da lógica
│
├── lib/
│   ├── env.ts                  # validação de env com Zod (fail-fast)
│   ├── supabase/
│   │   ├── client.ts           # browser client
│   │   ├── server.ts           # RSC / Server Action / Route Handler client
│   │   ├── session.ts          # refresh de sessão no proxy
│   │   └── admin.ts            # service-role (bypassa RLS) — só server, uso restrito
│   └── utils/
│
├── types/
│   └── database.ts             # gerado por `npm run db:types` (não editar à mão)
│
├── test/setup.ts               # setup global do Vitest
└── proxy.ts                    # Next.js proxy (ex-middleware): refresh + guarda de rotas

supabase/
├── config.toml
└── migrations/                 # SQL versionado, uma migration por entrega

specs/                          # SPEC.md / ACCEPTANCE.md / TESTS.md por feature
docs/                           # esta documentação
e2e/                            # testes Playwright
```

## Camadas e fluxo de dados

```
Server Component (page)  ──chama──▶  features/<f>/queries.ts  ──▶  supabase/server (RLS)
        │
        ▼ renderiza
   templates + organisms + atoms
        │
        ▼ submit (<form action>)
Server Action  ──valida (Zod)──▶  features/<f>/actions.ts  ──▶  supabase/server ou RPC transacional
        │
        ▼ revalidatePath / redirect
```

- **Nunca** chamar Supabase direto de uma página; passar por `queries.ts`/`actions.ts`.
- `actions.ts` sempre valida a entrada com o schema Zod da feature antes de tocar o banco.
- Erros de negócio retornam um estado tipado (`{ error, fieldErrors }`); exceções
  inesperadas sobem para o `error.tsx` do segmento.

## Autenticação e proteção de rotas

- `src/proxy.ts` roda em toda requisição: renova a sessão Supabase (cookies) e
  redireciona não autenticados para `/login` (RF-AUTH-003).
- O grupo `app/(app)` também chama `requireUser()` no `layout.tsx` — defesa em
  profundidade caso o matcher do proxy mude.
- Autorização por papel (RF-AUTH-004) é verificada por feature (em `queries.ts`/
  `actions.ts`) **e** garantida por RLS no banco.
- Login social (Google, Apple) via `supabase.auth.signInWithOAuth` →
  `/auth/callback` troca o código pela sessão. Ver
  [ADR-0002](./adr/0002-invite-and-social-auth.md).

## Estados de UI

Toda superfície assíncrona expõe os quatro estados (RNF-USA-003): `loading`
(`loading.tsx` / `<Spinner>` / `aria-busy`), `empty` (`<EmptyState>`), `success`,
`error` (`error.tsx` / alerta `role="alert"`).

## Responsividade

Mobile-first. `AppShell` usa `BottomNav` (mobile) e abre espaço para `SidebarNav`
(desktop, ≥ `md`). Todos os fluxos essenciais funcionam em smartphone (RNF-USA-002).

## Convenções

- Imports absolutos via `@/*`.
- Componentes: um arquivo por componente, `PascalCase` export nomeado, arquivo `kebab-case`.
- Server Actions: verbo no infinitivo (`signInWithPassword`, `confirmSale`).
- Nada de `console.log` (lint `no-console`, exceto `warn`/`error`).
