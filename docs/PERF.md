# Performance — latência de requisições

Um usuário relatou que "as requisições parecem meio devagar". Este documento
resume o que foi feito no código e o que depende de infraestrutura.

## Diagnóstico

A app roda em **Netlify Functions** (SSR) e o banco está no **Supabase região
`sa-east-1`** (São Paulo). As Functions do Netlify, no plano atual, executam em
região fixa nos EUA. Cada ida-e-volta ao Supabase (Auth ou Postgres) custa
~100–160 ms. Uma página autenticada fazia várias dessas chamadas **em série**:

| Etapa | Antes |
| --- | --- |
| Middleware (`proxy.ts` → `updateSession`) | `auth.getUser()` — 1 chamada de rede ao Auth |
| Layout `(app)` | `requireUser()` (`getUser` de novo) + `getActiveOrganization()` (query) |
| Página + feature queries | `getCurrentUser()` (`getUser` #3) + `requireActiveOrganization()` → `listMyOrganizations()` (query #2) + as queries de dados |

Ou seja, ~3 chamadas ao Auth e 2 queries idênticas de organização por navegação,
antes mesmo de buscar os dados da tela.

## Feito no código (este PR)

1. **Middleware usa `supabase.auth.getClaims()`** em vez de `getUser()`
   (`src/lib/supabase/session.ts`). Quando o projeto Supabase usa **JWT Signing
   Keys assimétricas**, o token é verificado **localmente** (sem rede). Se o
   projeto ainda usa o segredo HS256 legado, cai automaticamente em `getUser()`
   — sem regressão. `getSession()` interno continua renovando/reescrevendo os
   cookies quando o token expira.
2. **`React.cache()`** em `getCurrentUser`, `listMyOrganizations`,
   `getActiveOrganization` e `getMyProfile`. Layout, página e feature queries
   passam a compartilhar **uma** chamada por render, em vez de repetir. Colapsa
   ~3 `getUser` + 2 queries de org em 1 + 1.
3. **Queries paralelas** onde eram sequenciais sem dependência
   (`getFactoryNetworkOverview` em `src/features/network/queries.ts`:
   membros + ofertas + negociações agora em `Promise.all`).
4. `(app)/loading.tsx` + barra de progresso no topo — não deixam a app mais
   rápida, mas dão feedback imediato durante a navegação.

**Ganho esperado:** 2–4 round-trips a menos por navegação (~300–600 ms).

## Ação de infraestrutura (decisão do dono do projeto)

Verificar / aplicar, em ordem de custo-benefício:

1. **Habilitar "JWT Signing Keys" no Supabase** (Dashboard → Authentication →
   JWT Keys → migrar para chave assimétrica ECC/RSA). Desbloqueia a verificação
   local do item 1 acima em produção. Baixo risco, reversível.
2. **Aproximar as funções do banco.** Ou:
   - Netlify: definir a região das funções para `sa-east-1`
     (`netlify.toml` `[functions] region` ou painel) — pode exigir plano pago;
   - **ou** recriar o projeto Supabase em `us-east-1` para ficar perto do
     Netlify (envolve migração de dados + trocar `NEXT_PUBLIC_SUPABASE_URL` —
     mais disruptivo).
3. **Supabase connection pooler** (Supavisor, porta 6543 / modo transaction)
   para as conexões de servidor — reduz o custo de abrir conexão em cada
   invocação de função serverless.
4. Medir com o painel **Network** do navegador: comparar o **TTFB** de
   `/dashboard` antes/depois. Registrar no PR.

## Como medir

```
# local (com supabase start + npm run dev)
curl -s -o /dev/null -w "TTFB %{time_starttransfer}s  total %{time_total}s\n" \
  --cookie "<cookies de sessão>" http://localhost:3000/dashboard
```

Em produção, DevTools → Network → recarregar `/dashboard` → coluna "Waiting
(TTFB)" do documento.
