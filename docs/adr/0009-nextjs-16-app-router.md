# ADR-0009 — Next.js 16 (App Router) + Server Actions

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** SDD §20, RNF-PERF-001, RNF-MNT-001

## Contexto

O SDD fixa Next.js + React + TypeScript. Falta decidir a variante: App Router vs
Pages Router, e como fazer as mutações (Route Handlers/API vs Server Actions).

## Decisão

- **Next.js 16, App Router, Turbopack.** React 19.
- **Server Components** por padrão; Client Components só onde há interatividade.
- **Server Actions** para mutações (`"use server"` em `features/*/actions.ts`),
  consumidas via `<form action={...}>` e `useActionState`.
- **Route Handlers** apenas para integrações que exigem endpoint HTTP (ex.:
  `/auth/callback` do OAuth).
- Proteção de rotas via `src/proxy.ts` (o antigo `middleware.ts`; Next 16 renomeou
  a convenção para `proxy`).
- `typedRoutes` desligado até a superfície de rotas estabilizar (pós-Sprint 2),
  para não gerar ruído durante a criação incremental de páginas.

## Consequências

- Menos JavaScript no cliente; dados buscados no servidor com o client Supabase
  que respeita RLS.
- Padrão único de mutação (Server Action + Zod), sem camada de API REST paralela.
- Time precisa conhecer o modelo de renderização do App Router (cache,
  `revalidatePath`, streaming).
- Dependência de `@supabase/ssr` para propagação de sessão via cookies.

## Alternativas consideradas

- **Pages Router:** maduro, porém sem Server Components/Actions e divergente da
  direção do ecossistema.
- **App Router + tRPC/API routes:** camada extra sem ganho claro para o escopo.
