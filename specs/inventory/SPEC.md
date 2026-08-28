# SPEC-005 — Estoque e Movimentações

- **Status:** Rascunho
- **Sprint:** 3 (Operations)
- **Requisitos SDD:** RF-INV-001..006; SDD §12, §27
- **Telas:** `vestiq_invent_rio`, `vestiq_detalhes_do_produto` (tabela de variantes)
- **ADRs:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md),
  [0005](../../docs/adr/0005-inventory-balance-from-movements.md)

## Problema

O estoque precisa ser controlado por variação, rastreável (todo saldo tem
origem), auditável e nunca negativo.

## Objetivo

Registrar entradas, saídas, ajustes; manter histórico imutável; derivar o saldo
das movimentações; bloquear estoque negativo.

## Escopo

- `inventory_movements` (append-only) + cache `product_variants.stock_on_hand`.
- Funções RPC: `record_inventory_entry`, `adjust_inventory`.
- Tela de inventário (busca, filtros: todos / em estoque / estoque baixo / sem estoque).
- Alerta de estoque baixo (limiar configurável por organização; default 3).
- Histórico de movimentações por variação.
- Tipos `VENDA`, `CANCELAMENTO`, `TRANSFERENCIA_*` são gravados pelas features
  `sales` e `negotiations`, mas o modelo e as invariantes vivem aqui.

## Fora do Escopo

- Inventário cíclico / contagem física assistida (pós-MVP).
- Reserva de estoque para ofertas (a oferta não reserva — ver `offers`).

## Atores

`RESELLER`.

## Requisitos Relacionados

| RF         | Descrição                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| RF-INV-001 | Estoque controlado por variação                                                                                   |
| RF-INV-002 | Registrar movimentações (ENTRADA, SAIDA, AJUSTE, VENDA, CANCELAMENTO, TRANSFERENCIA_ENTRADA, TRANSFERENCIA_SAIDA) |
| RF-INV-003 | Toda alteração de estoque tem movimentação correspondente                                                         |
| RF-INV-004 | Manter histórico de movimentações                                                                                 |
| RF-INV-005 | Impedir estoque negativo                                                                                          |
| RF-INV-006 | Movimentações concluídas não são silenciosamente apagadas                                                         |

## User Stories

| ID        | Como…    | Quero…                                            | Para…                           |
| --------- | -------- | ------------------------------------------------- | ------------------------------- |
| US-INV-01 | RESELLER | registrar a entrada de peças recebidas            | atualizar meu estoque           |
| US-INV-02 | RESELLER | ajustar o saldo de uma variação (perda, correção) | refletir a realidade com rastro |
| US-INV-03 | RESELLER | ver o histórico de movimentações de uma variação  | entender como cheguei no saldo  |
| US-INV-04 | RESELLER | ser alertado sobre estoque baixo                  | repor a tempo                   |

## Regras de Negócio

| ID        | Regra                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| BR-INV-01 | Saldo é sempre por `product_variant`, nunca por produto                                                                 |
| BR-INV-02 | `quantity` do movimento é assinado: entrada `> 0`, saída `< 0`                                                          |
| BR-INV-03 | Qualquer alteração de `stock_on_hand` ocorre **apenas** dentro da função que grava o movimento (nenhum `update` avulso) |
| BR-INV-04 | `stock_on_hand` tem `check >= 0`; operação que violaria isso é abortada com erro claro                                  |
| BR-INV-05 | `inventory_movements` não aceita `UPDATE`/`DELETE` via RLS (append-only)                                                |
| BR-INV-06 | Cada movimento grava `balance_after` e, quando aplicável, `reference_type`/`reference_id`                               |
| BR-INV-07 | Invariante testada: `stock_on_hand == sum(quantity)` por variação                                                       |
| BR-INV-08 | Estoque baixo = `stock_on_hand <= limiar_org` e `> 0`; "sem estoque" = `0`                                              |
| BR-INV-09 | `AJUSTE` exige nota (motivo)                                                                                            |

## Fluxos

**Entrada:** revendedora informa variação + quantidade + nota → RPC
`record_inventory_entry` → movimento `ENTRADA` + `stock_on_hand += qty`.

**Ajuste:** variação + delta (±) + motivo → RPC `adjust_inventory` → valida saldo
resultante ≥ 0 → movimento `AJUSTE`.

**Histórico:** lista paginada de `inventory_movements` da variação, com tipo, data,
quantidade, saldo resultante, referência.

## Estados

Movimento não tem estado (é fato consumado). Variação: derivada do saldo →
`em estoque` / `estoque baixo` / `sem estoque`.

## Segurança

- `inventory_movements`: `select` por `is_org_member(organization_id)`; **sem**
  `insert/update/delete` diretos — só via RPC `security definer` que revalida a
  organização.
- Funções RPC checam `is_org_member` da variação antes de escrever.

## Casos de Erro

| Situação                           | Resposta                              |
| ---------------------------------- | ------------------------------------- |
| Ajuste que deixaria saldo negativo | "Estoque insuficiente: saldo atual N" |
| Quantidade de entrada ≤ 0          | erro de campo                         |
| Ajuste sem motivo                  | erro de campo                         |
| Variação de outra organização      | RPC recusa (RLS)                      |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migration `inventory_movements` + policy append-only + `check` de saldo
- [ ] RPC `record_inventory_entry`, `adjust_inventory` + trigger `balance_after`
- [ ] Actions finas + `validation.ts`
- [ ] Tela de inventário (busca, filtros, chips de status) + histórico da variação
- [ ] Limiar de estoque baixo por organização (settings)
- [ ] Testes: invariante saldo=soma, bloqueio de negativo, append-only, RLS
