# ADR-0005 — Saldo de estoque derivado das movimentações

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** RF-INV-001, RF-INV-003, RF-INV-004, RF-INV-005, SDD §27

## Contexto

SDD §27: "O saldo não deverá ser tratado como uma informação sem origem. A fonte
de rastreabilidade será `inventory_movements`." Ao mesmo tempo, o dashboard e as
listas de produto precisam do saldo atual sem somar o histórico inteiro a cada
leitura.

## Decisão

- **Fonte de verdade:** `inventory_movements` (append-only, quantidade assinada).
- **Cache:** `product_variants.stock_on_hand`, com `check (stock_on_hand >= 0)`
  (RF-INV-005).
- O cache **só** é alterado dentro das funções que inserem o movimento
  correspondente ([ADR-0004](./0004-atomic-operations-via-postgres-functions.md)).
  Nenhum `update` direto de `stock_on_hand` fora dessas funções.
- Cada movimento grava `balance_after` (saldo resultante) para auditoria.
- Teste de integração invariante: `stock_on_hand == sum(quantity)` por variação,
  após qualquer sequência de operações.

## Consequências

- Leituras O(1); histórico completo preservado para auditoria (RF-INV-004).
- Toda alteração de estoque tem um movimento (RF-INV-003) — garantido por não
  haver outro caminho de escrita.
- Risco de divergência cache × soma → coberto por teste e por um job de
  verificação opcional pós-piloto.

## Alternativas consideradas

- **Sempre somar os movimentos (view):** simples e sem risco de divergência, mas
  custo crescente e ruim para os índices do dashboard.
- **Só o cache, sem ledger:** viola SDD §27 e RF-INV-004.
