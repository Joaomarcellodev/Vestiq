# Teste de carga — fluxos principais da revendedora (VES-71)

Pedido do professor: medir o comportamento do sistema com a carga esperada.
Execução em **2026-10-29**, branch `feature/sprint6-network-trust` (migrations até 0047).

## Cenário

| Item | Valor |
| --- | --- |
| Ferramenta | [k6](https://k6.io) 0.54.0, pela imagem Docker oficial `grafana/k6:0.54.0` (nada instalado no projeto) |
| Script | [`scripts/load/vestiq-load.js`](../scripts/load/vestiq-load.js) — a jornada fica em [`journey.js`](../scripts/load/journey.js), compartilhada com o teste de estresse |
| Dados | [`scripts/load/setup.mjs`](../scripts/load/setup.mjs): 1 fábrica, 1 rede e **20 revendedoras próprias do teste** (`carga-N@vestiq.test`), cada uma com produto, 100 000 peças em estoque, oferta publicada e 3 vendas |
| Usuários simultâneos | **20** (uma revendedora por usuário virtual) — a rede piloto esperada: uma fábrica com ~20 revendedoras ativas ao mesmo tempo |
| Duração | 30 s de rampa → **3 min no pico** → 30 s de descida |
| Pausa entre ações | 1–3 s aleatórios (pessoa usando o app, não um robô em laço) |
| Ambiente | **teste local, nunca a produção**: `next start` (build de produção) + Supabase local (Docker), tudo na mesma máquina (28 núcleos, 15 GB) |

Cada iteração de um usuário virtual percorre os fluxos do VES-71:

| Fluxo (`flow`) | Requisição |
| --- | --- |
| `dashboard` | `GET /dashboard` |
| `rede` | `GET /rede` — feed de ofertas da rede |
| `inventario` | `GET /produtos/[id]` — estoque do produto |
| `historico` | `GET /produtos/[id]/variantes/[id]/historico` — movimentações |
| `venda` | `POST /rest/v1/rpc/confirm_sale` — a transação por trás de "Registrar venda" (baixa de estoque + venda + itens, ADR-0004) |
| `vendas` | `GET /vendas` — a lista onde a venda aparece |

As páginas vão autenticadas com os cookies de sessão do `@supabase/ssr`
(gerados pelo `setup.mjs` com o mesmo cliente do app); um redirecionamento para
`/login` conta como falha (`signed_out`). A venda chama a função do banco direto
pela API do Supabase com o token da revendedora — o Server Action do Next só
encaminha para ela, e montar o protocolo interno de Server Actions no k6 não
mediria nada além disso.

## Metas

| Meta | Limite | Origem |
| --- | --- | --- |
| p95 de cada fluxo | **< 1 s** | VES-71 (mais rígida que o RNF-PERF-001: 95% < 2 s) |
| Taxa de erro | **< 1%** | VES-71 |
| Sessões derrubadas | 0 | — |

## Resultado — 20 usuários (carga esperada)

| Fluxo | Requisições | p50 | p95 | p99 | máx |
| --- | ---: | ---: | ---: | ---: | ---: |
| dashboard | 499 | 113 ms | 143 ms | 155 ms | 182 ms |
| rede | 499 | 113 ms | 143 ms | 172 ms | 192 ms |
| inventário | 499 | 110 ms | 137 ms | 146 ms | 168 ms |
| histórico | 499 | 108 ms | 138 ms | 155 ms | 187 ms |
| registrar venda | 499 | 12 ms | 19 ms | 25 ms | 115 ms |
| vendas | 499 | 111 ms | 141 ms | 156 ms | 199 ms |

- **2 994 requisições** (12/s), 498 iterações completas, 499 vendas registradas.
- **Falhas: 0,03%** (1 de 2 994) — um `502` do Kong local numa `confirm_sale`
  ("upstream prematurely closed connection": corrida de keep-alive entre o
  gateway local e o PostgREST; o Postgres não registrou erro).
- Nenhuma sessão perdida. **Todas as metas atingidas**, com p95 ~7× abaixo de 1 s.

CPU no meio do pico (`docker stats`): Postgres ~105%, GoTrue (Auth) ~55%,
PostgREST ~8%, Kong ~5%; o `next-server` ~23%.

### Referência — 50 usuários (2,5× a carga esperada, 1 min no pico)

Rodada curta só para ver a folga e onde a carga pesa; o teste de estresse em si é o VES-72 ([STRESS_TEST.md](./STRESS_TEST.md)).

| Fluxo | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| dashboard | 129 ms | 213 ms | 262 ms |
| rede | 123 ms | 197 ms | 243 ms |
| inventário | 120 ms | 194 ms | 229 ms |
| histórico | 117 ms | 190 ms | 248 ms |
| registrar venda | 10 ms | 20 ms | 25 ms |
| vendas | 125 ms | 212 ms | 266 ms |

3 234 requisições (25,6/s), falhas 0,06% (mesmos `502` transitórios do Kong).
CPU: **Postgres ~380%, GoTrue ~210%**, PostgREST ~24%, Kong ~12%.

## Gargalos

1. **Custo fixo do layout em toda página.** Contando as chamadas ao Supabase na
   rodada de 50 usuários, cada página autenticada faz, antes do conteúdo:
   `GET /auth/v1/user` (o `requireUser()` do layout valida a sessão no GoTrue),
   `organization_members` (organização ativa), `notifications` (lista do sino) e
   `HEAD notifications` (contador). São 4 idas ao Supabase por página — e o
   GoTrue, que só atende a primeira, já é o 2º maior consumidor de CPU.
   **Sugestão:** o layout usar `getClaims()` (JWT verificado localmente, como o
   middleware já faz — os claims trazem `user_metadata` com nome e avatar) e o
   sino carregar a lista pelo `/api/notifications` no cliente, que ele já consulta.
2. **Postgres é o recurso que mais cresce com a carga** (105% → 380% de CPU de
   20 para 50 usuários). Além do custo fixo acima, o dashboard lê `sales` 3 vezes
   e `sale_items` 2 vezes por carregamento; uma função agregada (como a
   `factory_network_stats` da fábrica) trocaria isso por uma consulta.
3. **`confirm_sale` não é gargalo:** p95 de 19–20 ms nas duas rodadas, sem erro
   de concorrência (cada revendedora vende do próprio estoque, como no uso real).
4. **`502` transitório do Kong local** (0,03–0,06%): é do gateway do Supabase
   local, não do app; em produção o gateway é outro. Fica registrado porque é o
   único erro observado.

### Limites da medição

- Tudo na mesma máquina: não há latência de rede entre app, banco e usuário. Em
  produção o Netlify roda as funções em `us-east-2` e o banco fica em `sa-east-1`
  (ver [PERF.md](./PERF.md)): cada ida ao Supabase custa ~120–150 ms a mais, e o
  item 1 dos gargalos (4 idas fixas por página) pesa bem mais lá do que aqui.
- Os números servem para comparar versões do app na mesma máquina, não como
  promessa do tempo em produção.

## Como rodar

```bash
# 1. Supabase local no ar (docs/DEPLOY.md / scripts/seed.mjs)
DOCKER_HOST=unix:///var/run/docker.sock npx supabase start

# 2. Build de produção do app numa porta livre (o `next dev` não serve para medir;
#    pare o `next dev` antes — os dois usam a pasta `.next`)
npm run build && npx next start -p 3100

# 3. Contas do teste e cookies de sessão (válidos por ~1 h)
node scripts/load/setup.mjs 20

# 4. k6 (VUS e HOLD são opcionais: padrão 20 e 3m)
docker run --rm --network host -u "$(id -u):$(id -g)" \
  -v "$PWD/scripts/load:/load" -w /load \
  -e VUS=20 -e HOLD=3m grafana/k6:0.54.0 run --quiet vestiq-load.js

# 5. Limpa as contas de carga (e o que elas venderam)
node scripts/clean-test-data.mjs
```

O `setup.mjs` recusa qualquer Supabase que não seja o local; o resumo completo da
execução sai em `scripts/load/results/summary.json` (fora do git).
