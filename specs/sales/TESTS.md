# TESTS — Vendas

## Matriz de rastreabilidade

| RF              | AC             | TC         | Nível                         | Crítica §38 |
| --------------- | -------------- | ---------- | ----------------------------- | ----------- |
| RF-SALE-001     | AC-SALE-001-01 | TC-SALE-01 | integration + e2e             | não         |
| RF-SALE-002     | AC-SALE-002-01 | TC-SALE-02 | integration                   | não         |
| RF-SALE-003     | AC-SALE-003-01 | TC-SALE-03 | unit + integration            | não         |
| RF-SALE-004     | AC-SALE-004-01 | TC-SALE-04 | unit                          | não         |
| RF-SALE-004     | AC-SALE-004-02 | TC-SALE-05 | unit + component              | não         |
| RF-SALE-005     | AC-SALE-005-01 | TC-SALE-06 | integration                   | não         |
| RF-SALE-006     | AC-SALE-006-01 | TC-SALE-07 | integration                   | sim         |
| RF-SALE-007     | AC-SALE-007-01 | TC-SALE-08 | integration                   | sim         |
| RF-SALE-008     | AC-SALE-008-01 | TC-SALE-09 | integration                   | sim         |
| RF-SALE-009     | AC-SALE-009-01 | TC-SALE-10 | integration                   | sim         |
| RF-SALE-009     | AC-SALE-009-02 | TC-SALE-11 | integration (fault injection) | sim         |
| RF-SALE-006/007 | AC-SALE-concur | TC-SALE-12 | integration (concorrência)    | sim         |
| RF-SALE-008     | AC-SALE-resumo | TC-SALE-13 | integration                   | não         |

## Casos de teste

### TC-SALE-01 — Venda simples confirma e baixa estoque

integration + e2e · saldo 5 → venda 2 → saldo 3; venda `CONFIRMED`.

### TC-SALE-02 — Multi-item

integration · 2 itens, 2 variações, saldos reduzidos corretamente.

### TC-SALE-03 — Composição do item

unit + integration · `line_total = qty * unit_price`; item guarda produto+variação.

### TC-SALE-04 — Cálculo de total com desconto

unit · `total = subtotal - discount`.

### TC-SALE-05 — Desconto > subtotal recusado

unit + component · validação bloqueia antes da RPC; mensagem exibida.

### TC-SALE-06 — Método de pagamento persistido

integration · enum gravado; valor fora do enum rejeitado.

### TC-SALE-07 — Confirmação gera movimentos VENDA

integration · **crítica** · N movimentos negativos com `reference_id` da venda; `stock_on_hand` atualizado na mesma transação.

### TC-SALE-08 — Bloqueio atômico acima do saldo

integration · **crítica (RF-SALE-007, RNF-REL-002)** · um item excede → 0 escritas; saldos intactos; erro nomeia o produto.

### TC-SALE-09 — Cancelamento mantém no histórico

integration · **crítica (RF-SALE-008)** · `CANCELLED` + campos de cancelamento; ainda listada.

### TC-SALE-10 — Estorno ao cancelar

integration · **crítica (RF-SALE-009)** · movimentos `CANCELAMENTO` positivos; saldo restaurado ao valor pré-venda.

### TC-SALE-11 — Cancelamento atômico

integration (fault injection) · **crítica** · falha no meio do estorno → rollback total; venda segue `CONFIRMED`.

### TC-SALE-12 — Concorrência de estoque

integration · **crítica** · saldo 1, 2 confirmações paralelas → 1 sucesso, 1 falha; saldo final 0.

### TC-SALE-13 — Faturamento só de confirmadas

integration · não-crítica · canceladas fora do somatório.

## Cobertura de RF

`RF-SALE-001..009` ✔ — RF-SALE-006/007/008/009 são **regra crítica** (SDD §38).
