# ADR-0013 — Funções do Netlify na mesma região do banco (São Paulo)

- **Status:** Adiado (2026-10-27) — infraestrutura mantida como está; reavaliar se o desempenho piorar
- **Data:** 2026-10-26
- **Requisitos:** VES-60; RNF-PERF-001/002 (páginas principais abaixo de 2 s)

## Contexto

As páginas do Vestiq são renderizadas por uma função serverless do Netlify, que consulta
o Supabase. No plano **Free** do Netlify as funções rodam em `us-east-2` (Ohio) e a
região não pode ser trocada; o projeto Supabase está em `sa-east-1` (São Paulo). Cada
ida e volta função → banco custa **~250 ms** ([PERF.md](../PERF.md)).

O código já cortou o que dava: `sharp` fora do bundle (cold start), verificação local do
JWT com `getClaims()` e consultas do layout em paralelo. Uma página autenticada ainda faz
ao menos duas ondas de consultas em série, então medimos **0,78–1,1 s** de TTFB com a
função aquecida e **7,5 s** no cold start (2026-09-11). O ganho que resta é colocar
função e banco na mesma região.

## Opções

| Critério              | Netlify Pro → funções em São Paulo                           | Recriar o Supabase em `us-east-2`                                            |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Custo                 | Assinatura mensal do Netlify Pro (conferir o valor no painel) | Nenhum                                                                       |
| Migração              | Nenhuma: muda uma opção e faz um novo deploy                 | Exportar e importar o banco, o Storage (fotos) e os usuários do Auth         |
| Risco                 | Baixo; volta atrás trocando a região de novo                 | Alto: perda de dados, troca de URL e chaves, webhook do Stripe, templates do Auth |
| Latência para o usuário (Brasil) | Função e banco perto de quem usa                  | Função e banco nos EUA: cada página atravessa o continente                   |
| Prazo (sprint acaba em 30/10) | Cabe                                                 | Não cabe com segurança                                                        |

## Decisão

**Netlify Pro, com as funções em South America (São Paulo)**, no mesmo lugar do banco.
O projeto Supabase continua como está.

## Revisão — 2026-10-27

O time decidiu **não mudar a infraestrutura agora**: nenhuma assinatura paga no
projeto, e recriar o Supabase em `us-east-2` continua arriscado. O Vestiq atende bem
os usuários no Brasil com as funções em `us-east-2` e o banco em `sa-east-1`
(TTFB autenticado de 0,78–1,1 s com a função aquecida, abaixo da meta de 2 s).
A decisão acima fica registrada para quando a latência voltar a ser um problema; os
passos de *Como aplicar* continuam válidos.

## Consequências

- Custo mensal fixo do Netlify Pro enquanto o Vestiq estiver no ar.
- Cada consulta da função ao banco cai de ~250 ms para poucos ms; as páginas
  autenticadas devem ficar bem abaixo de 1 s com a função aquecida.
- A troca só vale **a partir do próximo deploy**.
- A medição antes/depois fica em [PERF.md](../PERF.md), com o mesmo método.

## Como aplicar

1. Netlify → *Team settings → Billing*: assinar o plano Pro (quem tem o cartão da conta).
2. *Project configuration → Build & deploy → Continuous deployment → Functions region* →
   **South America (São Paulo) — `sa-east-1`**.
3. Novo deploy de produção (junto com o próximo release `develop → main`).
4. Medir de novo e registrar em [PERF.md](../PERF.md).

## Evidência posterior — teste de estresse (2026-10-29, VES-72)

O teste de estresse local ([STRESS_TEST.md](../STRESS_TEST.md)) quebrou pelo
**banco** (CPU do Postgres e fila do PostgREST), não pela função nem pela rede.
O adiamento continua valendo: reduzir as idas ao Supabase por página e agregar o
dashboard no banco ataca a carga e a distância ao mesmo tempo, sem plano pago.
