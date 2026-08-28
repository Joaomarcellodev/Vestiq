# TESTS — Estoque

## Matriz de rastreabilidade

| RF              | AC            | TC        | Nível                   | Crítica §38 |
| --------------- | ------------- | --------- | ----------------------- | ----------- |
| RF-INV-001      | AC-INV-001-01 | TC-INV-01 | integration             | sim         |
| RF-INV-002      | AC-INV-002-01 | TC-INV-02 | integration             | sim         |
| RF-INV-003      | AC-INV-003-01 | TC-INV-03 | integration             | sim         |
| RF-INV-004      | AC-INV-004-01 | TC-INV-04 | integration             | sim         |
| RF-INV-005      | AC-INV-005-01 | TC-INV-05 | integration             | sim         |
| RF-INV-005      | AC-INV-005-02 | TC-INV-06 | integration             | sim         |
| RF-INV-006      | AC-INV-006-01 | TC-INV-07 | integration             | sim         |
| RF-INV-001..005 | AC-INV-inv    | TC-INV-08 | integration (property)  | sim         |
| RF-INV-001      | AC-INV-baixo  | TC-INV-09 | unit + component        | não         |
| RF-INV-004      | AC-INV-rls    | TC-INV-10 | integration (2 tenants) | sim         |

## Casos de teste

### TC-INV-01 — Saldo isolado por variação

Entrada em P não altera M. Saldos independentes.

### TC-INV-02 — Entrada gera movimento + atualiza cache

`ENTRADA(+20)` → movimento com `balance_after=20`, `stock_on_hand=20`, `reference_type='manual'`.

### TC-INV-03 — Nenhuma alteração de saldo sem movimento

Revogar `UPDATE` direto de `stock_on_hand` a `authenticated`; provar que só as RPCs escrevem. Contar movimentos == contar deltas de saldo.

### TC-INV-04 — Histórico ordenado com saldos corretos

Sequência +20/-3/-1 → lista [20,17,16].

### TC-INV-05 — Ajuste negativo além do saldo é recusado

Saldo 2, `AJUSTE(-5)` → erro; 0 movimentos novos; saldo 2.

### TC-INV-06 — Constraint `check (stock_on_hand >= 0)`

Forçar update inválido em transação de teste → erro do Postgres.

### TC-INV-07 — Movimentos são append-only

`UPDATE`/`DELETE` em `inventory_movements` como `authenticated` → negado por RLS.

### TC-INV-08 — Invariante saldo = soma (property-based)

Gerar N sequências aleatórias de operações válidas; ao fim, `stock_on_hand == sum(quantity)` sempre.

### TC-INV-09 — Classificação de estoque

`classify(saldo, limiar)` → `sem-estoque | baixo | ok`; chips na tela refletem.

### TC-INV-10 — RLS de movimentações

Revendedora A não lê movimentos de B; RPC recusa variação de B.

## Cobertura de RF

`RF-INV-001..006` ✔ — todos são **regra crítica** (SDD §38), cobertura automatizada obrigatória.
