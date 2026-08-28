# ACCEPTANCE — Estoque

## AC-INV-001-01 — Saldo por variação

**Dado** um produto com variações P e M
**Quando** entram 10 unidades em P
**Então** o saldo de P é 10 e o de M permanece inalterado.

## AC-INV-002-01 — Movimento de entrada

**Dado** uma variação com saldo 0
**Quando** a revendedora registra ENTRADA de 20 com nota "compra jan"
**Então** existe um `inventory_movements` tipo ENTRADA, `quantity = 20`, `balance_after = 20`
**E** `stock_on_hand = 20`.

## AC-INV-003-01 — Toda alteração tem movimento

**Dado** qualquer mudança de `stock_on_hand`
**Então** existe exatamente um `inventory_movements` que a explica
**E** não há caminho de escrita que altere o saldo sem gerar movimento.

## AC-INV-004-01 — Histórico

**Dado** uma variação com ENTRADA(+20), VENDA(-3), AJUSTE(-1)
**Quando** a revendedora abre o histórico
**Então** vê as 3 movimentações em ordem, com saldos 20, 17, 16.

## AC-INV-005-01 — Bloqueio de negativo (ajuste)

**Dado** uma variação com saldo 2
**Quando** a revendedora tenta um AJUSTE de -5
**Então** a operação é recusada com "Estoque insuficiente: saldo atual 2"
**E** nenhum movimento é gravado
**E** o saldo continua 2.

## AC-INV-005-02 — Constraint de banco

**Dado** uma tentativa de deixar `stock_on_hand < 0` por qualquer via
**Então** o banco rejeita (`check` constraint).

## AC-INV-006-01 — Append-only

**Dado** um `inventory_movements` existente
**Quando** se tenta `UPDATE` ou `DELETE` nele
**Então** a RLS/So banco recusa.

## AC-INV-inv — Invariante saldo = soma

**Dado** qualquer sequência de movimentos numa variação
**Então** `stock_on_hand == sum(quantity)` dessa variação.

## AC-INV-baixo — Alerta de estoque baixo

**Dado** limiar 3 e uma variação com saldo 1
**Então** ela aparece em "Estoque baixo" com "1 restante"
**E dado** saldo 0, aparece em "Sem estoque".

## AC-INV-rls — Isolamento

**Dado** revendedoras A e B
**Quando** A consulta movimentações
**Então** vê só as suas.
