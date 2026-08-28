# TESTS — Negociação

## Matriz de rastreabilidade

| RF         | AC               | TC        | Nível                         | Crítica §38         |
| ---------- | ---------------- | --------- | ----------------------------- | ------------------- |
| RF-NEG-001 | AC-NEG-001-01    | TC-NEG-01 | integration + e2e             | não                 |
| RF-NEG-002 | AC-NEG-002-01    | TC-NEG-02 | integration                   | não                 |
| RF-NEG-002 | AC-NEG-002-02    | TC-NEG-03 | integration                   | sim (estoque)       |
| RF-NEG-003 | AC-NEG-transicao | TC-NEG-04 | unit                          | sim (estado)        |
| RF-NEG-004 | AC-NEG-004-01    | TC-NEG-05 | integration                   | sim (estado)        |
| RF-NEG-004 | AC-NEG-004-02    | TC-NEG-06 | integration                   | sim (estado)        |
| RF-NEG-004 | AC-NEG-004-03    | TC-NEG-07 | integration                   | sim (autorização)   |
| RF-NEG-005 | AC-NEG-005-01    | TC-NEG-08 | integration                   | sim (estado)        |
| RF-NEG-005 | AC-NEG-005-02    | TC-NEG-09 | integration (2 tenants)       | sim (isolamento)    |
| RF-NEG-006 | AC-NEG-006-01    | TC-NEG-10 | integration                   | sim (estado)        |
| RF-NEG-007 | AC-NEG-007-01    | TC-NEG-11 | integration                   | sim (transferência) |
| RF-NEG-007 | AC-NEG-007-02    | TC-NEG-12 | integration                   | sim                 |
| RF-NEG-008 | AC-NEG-008-01    | TC-NEG-13 | integration (fault injection) | sim                 |
| RF-NEG-008 | AC-NEG-008-02    | TC-NEG-14 | integration (concorrência)    | sim                 |
| RF-NEG-009 | AC-NEG-009-01    | TC-NEG-15 | integration                   | sim (auditoria)     |

## Casos de teste

### TC-NEG-01 — Abrir proposta

integration + e2e · `PENDING` criada; evento `CREATED`; oferta continua ativa.

### TC-NEG-02 — Campos da proposta

integration · registra as duas orgs, oferta, quantidade, valor, mensagem, status.

### TC-NEG-03 — Quantidade > remaining

integration · **crítica** · proposta recusada com mensagem de disponibilidade.

### TC-NEG-04 — Máquina de estados (property/tabela)

unit · **crítica** · para cada par (estado, ação): resultado esperado; toda transição fora da tabela → erro. Cobrir `PENDING→COMPLETED`, `REJECTED→ACCEPTED`, `COMPLETED→*`, etc.

### TC-NEG-05 — Aceitar

integration · **crítica** · vendedora aceita `PENDING` → `ACCEPTED` + evento.

### TC-NEG-06 — Rejeitar

integration · **crítica** · vendedora rejeita → `REJECTED` terminal.

### TC-NEG-07 — Papel na ação

integration · **crítica (autorização)** · compradora não aceita/rejeita/conclui; terceira org não age.

### TC-NEG-08 — Compradora cancela pendente

integration · **crítica** · `PENDING → CANCELLED` pela compradora + evento.

### TC-NEG-09 — Isolamento da negociação

integration (2 tenants) · **crítica (isolamento)** · org sem relação → `select` na negociação = 0 linhas; ações → erro.

### TC-NEG-10 — Concluir aceita

integration · **crítica** · `ACCEPTED → COMPLETED` pela vendedora, `completed_at` set.

### TC-NEG-11 — Movimentos de transferência

integration · **crítica (RF-NEG-007)** · `TRANSFERENCIA_SAIDA(−q)` na origem + `TRANSFERENCIA_ENTRADA(+q)` no destino; saldos e `offer.quantity_remaining` corretos; variação criada/atualizada no catálogo da compradora conforme `ADR.md` local.

### TC-NEG-12 — Atomicidade da conclusão

integration · **crítica (RNF-REL-001)** · os dois movimentos + updates numa única transação (verificar via checkpoint/So savepoint).

### TC-NEG-13 — Rollback em falha parcial

integration (fault injection) · **crítica (RF-NEG-008)** · forçar erro no 2º movimento → 1º desfeito; saldos e negociação inalterados (`ACCEPTED`).

### TC-NEG-14 — Estoque insuficiente na origem na conclusão

integration · **crítica** · venda local reduz o saldo abaixo de `quantity` → concluir falha; estado `ACCEPTED`; 0 movimentos.

### TC-NEG-15 — Histórico permanece

integration · **crítica (RF-NEG-009)** · após `COMPLETED`, todos os eventos consultáveis, em ordem; nenhum evento apagável.

## Cobertura de RF

`RF-NEG-001..009` ✔ — a maioria é **regra crítica** (SDD §38).
