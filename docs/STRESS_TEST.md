# Teste de estresse — até o ponto de quebra (VES-72)

Pedido do professor: aumentar a carga até o sistema falhar, para conhecer os
limites. Complementa o [teste de carga](./LOAD_TEST.md) (VES-71), com a mesma
jornada de revendedora. Execução em **2026-10-29**, código da `main` da Sprint 6
(migrations até 0047).

## Cenário

| Item | Valor |
| --- | --- |
| Ferramenta | k6 0.54.0 (`grafana/k6:0.54.0` no Docker) |
| Script | [`scripts/load/vestiq-stress.js`](../scripts/load/vestiq-stress.js) — jornada em [`journey.js`](../scripts/load/journey.js), a mesma do teste de carga |
| Dados | `node scripts/load/setup.mjs 100` — **100 revendedoras de teste**, cada uma com estoque, oferta e 3 vendas iniciais |
| Degraus | **25 → 50 → 100 → 150 → 200 → 300** usuários simultâneos; cada degrau sobe em 1 min e segura 1 min |
| Recuperação | cai para **10 usuários** por 2 min e para |
| Tempo limite por requisição | 10 s (depois disso conta como erro: a pessoa desiste) |
| "Quebrou" quando | p95 > **2 s** (RNF-PERF-001) ou erros > **5%** |
| Recursos | [`sample-resources.sh`](../scripts/load/sample-resources.sh) a cada 5 s: CPU do `next-server` e dos containers do Supabase, conexões no Postgres |
| Ambiente | local, nunca a produção: `next start` (build de produção) + Supabase local, mesma máquina (28 núcleos, 15 GB) |

A tabela abaixo sai de `node scripts/load/stress-report.mjs`, que agrupa a saída
CSV do k6 e as amostras de recursos em janelas de 30 s. CPU em % de um núcleo
(800% = 8 núcleos).

## Resultado

| t (s) | Usuários | req/s | p95 | Erros | CPU Next | CPU Postgres | CPU PostgREST | CPU Auth | Conexões |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 60 | 25 | 14,7 | 140 ms | 0,0% | 46% | 183% | 11% | 66% | 50 |
| 180 | 50 | 32,1 | 187 ms | 0,0% | 66% | 497% | 23% | 161% | 42 |
| 210 | 50 | 34,8 | 238 ms | 0,1% | 64% | 523% | 21% | 146% | 43 |
| 270 | 81 | 45,3 | 365 ms | 0,1% | 97% | 643% | 25% | 229% | 43 |
| 300 | 100 | **54,7** | 744 ms | 0,1% | 105% | 796% | 31% | 201% | 43 |
| 330 | 100 | 54,8 | 969 ms | 0,0% | 110% | 785% | 71% | 182% | 43 |
| 360 | 106 | 51,7 | 1,47 s | 0,1% | 120% | 856% | 102% | 226% | 43 |
| 390 | 131 | 48,6 | **2,62 s** | 0,2% | 203% | 798% | 287% | 181% | 42 |
| 420 | 150 | 46,5 | 3,15 s | 0,1% | 125% | 953% | 816% | 186% | 43 |
| 480 | 156 | 39,5 | 4,71 s | 0,5% | 86% | 871% | 1119% | 142% | 44 |
| 540 | 200 | 38,3 | 7,15 s | 1,6% | 120% | 852% | 940% | 93% | 43 |
| 570 | 200 | 38,6 | 8,43 s | 2,8% | 205% | 925% | 1018% | 101% | 43 |
| 630 | 263 | 37,4 | 10 s | **8,1%** | 158% | 946% | 1046% | 90% | 42 |
| 690 | 300 | 40,4 | 10 s | 22,4% | 110% | 897% | 1033% | 33% | 42 |
| 720 | 300 | 40,9 | 10 s | 24,1% | 202% | 875% | 938% | 16% | 42 |
| 780 | 16 | 7,0 | 307 ms | 0,0% | 10% | 170% | 4% | 20% | 42 |
| 840 | 10 | 6,9 | 326 ms | 0,0% | 32% | 207% | 6% | 40% | 42 |

Na execução inteira: 28 336 requisições, 4 644 jornadas completas, 3,77% de erros
(962 por tempo limite, o resto respostas de erro do servidor).

### Pontos de quebra

| Limite | Onde aconteceu |
| --- | --- |
| **Vazão máxima** | ~**55 req/s** com **100 usuários**. Acima disso a vazão **cai** (37–41 req/s): o sistema satura e cada requisição a mais só aumenta a fila |
| **p95 > 2 s** (RNF-PERF-001) | entre **106 e 131 usuários** — ~6× a carga esperada de 20 (VES-71) |
| **Erros > 5%** | com **~260 usuários**: as páginas passam dos 10 s e o Next começa a receber conexões fechadas do Supabase (`fetch failed … other side closed`, 685 vezes no log) |

## Primeiro gargalo: o Postgres

1. **Postgres.** É o primeiro a encostar no teto: ~500% de CPU com 50 usuários,
   ~800% com 100 (quando o p95 sobe), ~950% no pico, e não passa disso. Ele
   satura antes de qualquer outro componente.
2. **PostgREST, por consequência.** Fica em 20–30% até 100 usuários e salta para
   800–1100% depois que o banco satura: com as conexões já ocupadas, as
   requisições se acumulam na fila dele.
3. **Conexões do banco não são o limite.** Ficaram estáveis em ~42–50 durante todo
   o teste (`max_connections` = 100): o pool do PostgREST é fixo, então a carga
   vira **fila**, não conexão nova. Por isso a latência cresce aos poucos, em vez
   de o banco recusar conexões de uma vez.
4. **Next (o equivalente local da função do Netlify).** Fica em 1–2 núcleos e não
   satura. Os erros que ele mostra são as conexões fechadas pelo Supabase, não
   falta de CPU.
5. **Auth (GoTrue).** Responde ao `getUser()` de cada página. Sobe até ~230% e
   depois **cai** (16–40% com 300 usuários): as páginas ficam presas esperando o
   banco antes de chegar à próxima chamada de Auth.

Por que o banco pesa tanto: cada página faz 4 chamadas fixas ao Supabase no
layout (VES-71) mais as da própria página. E **o dashboard lê todos os itens de
venda da loja, sem filtro de data**, para montar os "mais vendidos"
(`src/features/dashboard/queries.ts`, consulta de `sale_items` sem `.gte`):

| Página (ociosa, depois do teste) | Antes (3 vendas por loja) | Depois (~50 vendas por loja) |
| --- | ---: | ---: |
| `/rede` | ~113 ms | ~114 ms |
| `/dashboard` | ~113 ms | **~300 ms** |

O dashboard cresce com o histórico de vendas da loja: numa loja real, com
centenas de vendas, ele fica mais lento a cada mês, com ou sem carga.

## Recuperação

**O sistema se recupera sozinho**, sem reiniciar nada. Quando a carga caiu de 300
para 10 usuários:

- os erros voltaram a **0%** na primeira janela de 30 s;
- a CPU de PostgREST e Auth voltou ao normal na hora, e a do Postgres para
  ~170–210%;
- nenhuma sessão caiu e nenhum componente travou.

O p95 voltou a ~310–330 ms, e não aos ~140 ms do início. A diferença é o efeito
do dashboard acima: as lojas de teste saíram de 3 para ~50 vendas durante o
teste. As páginas que não dependem do histórico de vendas (o feed) voltaram ao
tempo inicial.

## Recomendações

Em ordem de impacto por esforço:

1. **Dashboard com agregação no banco.** Uma função SQL que devolva os KPIs, a
   série de 14 dias e os mais vendidos já somados, como a `factory_network_stats`
   da fábrica faz, ou ao menos limitar os "mais vendidos" a um período. Tira do
   dashboard o custo que cresce com o histórico.
2. **Menos idas ao Supabase por página** (gargalo do VES-71): o layout usar
   `getClaims()` (JWT verificado localmente) em vez do `getUser()`, e o sino
   carregar a lista pelo `/api/notifications` no cliente. São 4 → 1–2 chamadas
   fixas por página, que é carga a menos no banco e no Auth.
3. **Índices para o que o RLS consulta a cada linha** (`organization_members` por
   `user_id`/`organization_id`, já existentes, e `organizations.status` desde a
   0047): conferir com `EXPLAIN ANALYZE` as consultas do dashboard e do feed
   antes de crescer a rede.
4. **Tempo limite e mensagem amigável** nas chamadas do servidor ao Supabase:
   quando o banco satura, a revendedora vê a página de erro do app
   (`(app)/error.tsx`), e não uma espera de 10 s.

### Ligação com a decisão de região (ADR-0013, antiga VES-60)

A [ADR-0013](./adr/0013-functions-region-sao-paulo.md) adiou a troca de região
das funções (exige plano pago do Netlify). Este teste reforça essa decisão para o
tamanho atual da rede:

- **O limite não é a região nem a função**: localmente, sem latência de rede, o
  sistema já quebra pelo **banco**. A função do Netlify escala sozinha (uma
  instância por requisição), então o limite do processo único do Next daqui nem
  existe em produção.
- **Em produção o banco é bem menor**: o Supabase do plano gratuito tem uma
  fração da CPU desta máquina, então os pontos de quebra absolutos de lá serão
  **mais baixos** que os ~100–130 usuários daqui. A ordem dos gargalos (banco →
  fila do PostgREST) é o que se transfere.
- **Onde a região pesa**: cada ida ao Supabase custa ~120–150 ms a mais com as
  funções em `us-east-2`. As recomendações 1 e 2 cortam idas ao banco, então
  reduzem ao mesmo tempo a carga no banco e o custo da distância, sem plano pago.
  Rever a ADR-0013 só se, depois delas, a rede crescer além de algumas dezenas de
  revendedoras ativas ao mesmo tempo.

## Como rodar

Mesmo preparo do [teste de carga](./LOAD_TEST.md#como-rodar) (Supabase local,
`next start -p 3100`), com mais contas:

```bash
node scripts/load/setup.mjs 100

# amostras de recursos enquanto o k6 roda (pid do next-server da porta 3100)
scripts/load/sample-resources.sh "$(ss -ltnp | grep ':3100' | grep -o 'pid=[0-9]*' | cut -d= -f2)" \
  > scripts/load/results/samples.csv &

# ~15 min; STEPS e RECOVERY_VUS mudam os degraus (padrão 25,50,100,150,200,300 e 10)
docker run --rm --network host -u "$(id -u):$(id -g)" \
  -v "$PWD/scripts/load:/load" -w /load \
  grafana/k6:0.54.0 run --quiet --out csv=results/stress.csv vestiq-stress.js

node scripts/load/stress-report.mjs   # tabela por janela de 30 s
node scripts/clean-test-data.mjs      # remove as contas de teste
```

O k6 termina com o código 99 (metas de quebra ultrapassadas). Neste teste isso é
o esperado, não uma falha do script.
