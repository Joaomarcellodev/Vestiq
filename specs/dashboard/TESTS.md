# TESTS — Dashboards

## Matriz de rastreabilidade

| RF                  | AC                     | TC         | Nível                    | Crítica §38       |
| ------------------- | ---------------------- | ---------- | ------------------------ | ----------------- |
| RF-DASH-001         | AC-DASH-001-01         | TC-DASH-01 | unit + integration       | não               |
| RF-DASH-001         | AC-DASH-001-02         | TC-DASH-02 | integration              | não               |
| RF-DASH-001         | AC-DASH-001-03         | TC-DASH-03 | integration              | não               |
| RF-DASH-001         | AC-DASH-001-04         | TC-DASH-04 | component                | não               |
| RF-DASH-001         | AC-DASH-001-05         | TC-DASH-05 | integration (2 tenants)  | sim (isolamento)  |
| RF-FACTORY-DASH-001 | AC-FACTORY-DASH-001-01 | TC-DASH-06 | integration              | não               |
| RF-FACTORY-DASH-001 | AC-FACTORY-DASH-001-02 | TC-DASH-07 | integration + contract   | sim (privacidade) |
| RF-FACTORY-DASH-001 | AC-FACTORY-DASH-001-03 | TC-DASH-08 | integration (2 fábricas) | sim (isolamento)  |
| RF-FACTORY-DASH-001 | AC-FACTORY-DASH-001-04 | TC-DASH-09 | component                | não               |
| RF-FACTORY-DASH-001 | AC-FACTORY-DASH-001-05 | TC-DASH-10 | integration              | não               |
| RF-FACTORY-DASH-001 | AC-FACTORY-DASH-001-06 | TC-DASH-11 | integration (RLS)        | sim (privacidade) |

## Casos de teste

### TC-DASH-01 — Cálculos da revendedora

unit + integration · faturamento = Σ vendas `CONFIRMED` no período; ticket médio = faturamento / nº vendas; canceladas não contam.

### TC-DASH-02 — Estoque baixo

integration · lista variações `0 < saldo ≤ limiar`.

### TC-DASH-03 — Ranking mais vendidos

integration · ordena por soma de `quantity`; emp* desempate estável por nome.

### TC-DASH-04 — Estados vazios

component · sem dados → "R$ 0,00" / "sem dados"; nenhum erro de render.

### TC-DASH-05 — Isolamento da revendedora

integration (2 tenants) · **crítica (isolamento)** · números de A não incluem B.

### TC-DASH-06 — Agregados da rede

integration · contagens de revendedoras/ativas/ofertas/negociações batem com o seed.

### TC-DASH-07 — Nenhum dado privado exposto

integration + teste de contrato · **crítica (SDD §18)** · schema da resposta do dashboard da fábrica não contém campos monetários de venda, nem `customer_*`, nem itens vendidos por revendedora. Snapshot do JSON validado contra allowlist de campos.

### TC-DASH-08 — Isolamento por fábrica

integration (2 fábricas) · **crítica (isolamento)** · admin de F1 só conta a rede de F1.

### TC-DASH-09 — Rede vazia

component · estado vazio + CTA; taxa de utilização 0%.

### TC-DASH-10 — Convites pendentes fora da contagem

integration · rede com 1 ativa + 1 convite pendente + 1 convite expirado → `resellers = 1`, `pendingInvites = 1`, utilização 100% (`src/features/network/network-stats.integration.test.ts`).

### TC-DASH-11 — View só com agregados

integration (RLS) · **crítica (SDD §18)** · duas revendedoras negociando entre si: a fábrica vê as contagens reais pela view, mas `select` em `offers`/`negotiations` volta vazio; a view só tem as colunas de contagem; revendedora (da própria rede ou de outra) e visitante anônimo não leem a view (`src/features/network/network-stats.integration.test.ts`).

## Cobertura de RF

`RF-DASH-001` ✔ · `RF-FACTORY-DASH-001` ✔ (com verificação explícita da restrição de privacidade — SDD §18).
