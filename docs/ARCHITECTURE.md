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
│   ├── auth/callback/route.ts  # troca de código PKCE (link de redefinição de senha)
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
│   ├── zod.ts                  # `z` com mensagens em pt-BR — importar daqui, nunca de "zod"
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
- Schemas importam `z` de `@/lib/zod`, que traz as mensagens padrão em pt-BR (VES-78;
  o ESLint barra `import ... from "zod"` fora dos testes). Campos que o usuário
  preenche ganham mensagem própria que nomeia o campo ("O custo não pode ser negativo").
- Com erro de validação, a action devolve também `fieldErrors` por caminho
  (`fieldErrorsOf`, ex.: `variants.0.initialStock`) para o formulário mostrar a
  mensagem junto do campo; os `min` dos inputs numéricos seguem o schema.
- Erros de negócio retornam um estado tipado (`{ error, fieldErrors }`); exceções
  inesperadas sobem para o `error.tsx` do segmento.
- Erro de RPC vira mensagem com `rpcErrorMessage` (`@/lib/supabase/errors`, VES-79):
  o texto do `raise exception` (P0001 ou `check_violation`) aparece inteiro; guardas
  em inglês ("not authorized") e erros inesperados do banco ganham texto fixo em pt-BR.
- Listas que crescem com o uso (`/produtos`, `/clientes`, `/negociacoes`, `/rede`)
  são paginadas por número (`?pagina=N`, VES-90): a query pede `PAGE_SIZE + 1`
  linhas com `.range(...pageRange(page))` e `pageOf` corta a sobra, que só diz se há
  próxima página; a ordem termina em `id` para as páginas não se sobreporem. Busca
  e filtros rodam **no banco, antes do corte** — filtrar depois esconderia
  resultados de outras páginas (por isso a busca do feed foi para
  `list_visible_offers(p_query)`, migration 0039). O `Pager` preserva busca e abas.

## Autenticação e proteção de rotas

- `src/proxy.ts` roda em toda requisição: renova a sessão Supabase (cookies) e
  redireciona não autenticados para `/login` (RF-AUTH-003).
- O grupo `app/(app)` também chama `requireUser()` no `layout.tsx` — defesa em
  profundidade caso o matcher do proxy mude.
- Autorização por papel (RF-AUTH-004) é verificada por feature (em `queries.ts`/
  `actions.ts`) **e** garantida por RLS no banco.
- Login só por email e senha (`signInWithPassword`); não há login social. O
  link de redefinição de senha volta por `/auth/callback` e o do convite por
  `/auth/confirm`. Ver [ADR-0002](./adr/0002-invite-and-social-auth.md).

## Estados de UI

Toda superfície assíncrona expõe os quatro estados (RNF-USA-003): `loading`
(`loading.tsx` / `<Spinner>` / `aria-busy`), `empty` (`<EmptyState>`), `success`,
`error` (`error.tsx` / alerta `role="alert"`).

Ações destrutivas pedem confirmação (VES-93) com `<ConfirmButton>`
(`components/molecules/confirm-button.tsx`): o botão só abre um `<dialog>` modal
nativo — foco preso e devolvido, Esc fecha, fundo inerte, título e descrição ligados
por `aria-labelledby`/`aria-describedby` — que explica a consequência e se dá para
desfazer. O diálogo fica dentro do `<form>`, então o botão de confirmar é o submit de
verdade (leva `name`/`value`). Usado em cancelar oferta, recusar pedido, arquivar
produto e arquivar cliente; nunca `window.confirm`.

## Responsividade

Mobile-first. `AppShell` usa `BottomNav` (mobile) e abre espaço para `SidebarNav`
(desktop, ≥ `md`). Todos os fluxos essenciais funcionam em smartphone (RNF-USA-002).

## Convenções

- Imports absolutos via `@/*`.
- Componentes: um arquivo por componente, `PascalCase` export nomeado, arquivo `kebab-case`.
- Server Actions: verbo no infinitivo (`signInWithPassword`, `confirmSale`).
- Nada de `console.log` (lint `no-console`, exceto `warn`/`error`).
