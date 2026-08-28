# ACCEPTANCE — Vendas

## AC-SALE-001-01 — Registrar venda simples

**Dado** uma variação com saldo 5
**Quando** a revendedora confirma uma venda de 2 unidades, pagamento Pix
**Então** existe uma `sales` `CONFIRMED` com 1 item
**E** o saldo da variação passa a 3.

## AC-SALE-002-01 — Múltiplos itens

**Quando** a revendedora confirma uma venda com 2 produtos diferentes
**Então** a venda tem 2 `sale_items`
**E** cada variação tem seu saldo reduzido pela respectiva quantidade.

## AC-SALE-003-01 — Dados do item

**Então** cada item registra produto, variação, quantidade e `unit_price`
**E** `line_total = quantity * unit_price`.

## AC-SALE-004-01 — Desconto

**Dado** subtotal R$ 20.900,00
**Quando** a revendedora aplica desconto de R$ 900,00
**Então** o total é R$ 20.000,00.

## AC-SALE-004-02 — Desconto inválido

**Quando** o desconto informado é maior que o subtotal
**Então** a confirmação é bloqueada com "Desconto maior que o subtotal".

## AC-SALE-005-01 — Forma de pagamento

**Então** a venda registra `payment_method ∈ {PIX, CARTAO, DINHEIRO}`.

## AC-SALE-006-01 — Confirmação baixa estoque

**Dado** saldos P=10, M=5
**Quando** confirma venda de 3 P e 2 M
**Então** P=7 e M=3
**E** há 2 movimentos `VENDA` com `reference_type='sale'` e o id da venda.

## AC-SALE-007-01 — Bloqueio acima do disponível (atômico)

**Dado** saldos P=10, M=1
**Quando** confirma venda de 3 P e 2 M
**Então** a operação é recusada ("Estoque insuficiente para M (disponível 1)")
**E** P continua 10, M continua 1
**E** nenhuma `sales`/`sale_items`/movimento é criado.

## AC-SALE-008-01 — Cancelamento preserva histórico

**Dado** uma venda `CONFIRMED`
**Quando** a revendedora a cancela com motivo
**Então** `status = CANCELLED`, `cancelled_at` e `cancel_reason` preenchidos
**E** a venda continua listada no histórico (do cliente e de vendas).

## AC-SALE-009-01 — Estorno ao cancelar

**Dado** uma venda de 2 unidades de P (saldo ficou 3)
**Quando** a venda é cancelada
**Então** o saldo de P volta a 5
**E** há um movimento `CANCELAMENTO` de +2.

## AC-SALE-009-02 — Cancelamento é atômico

**Dado** uma falha ao gravar um dos movimentos de estorno
**Então** nada é alterado: a venda permanece `CONFIRMED` e os saldos inalterados.

## AC-SALE-concur — Concorrência

**Dado** saldo 1 e duas confirmações simultâneas de 1 unidade
**Então** exatamente uma confirma; a outra falha por estoque insuficiente.

## AC-SALE-resumo — Faturamento

**Dado** 3 vendas confirmadas e 1 cancelada
**Então** o faturamento do resumo soma apenas as 3 confirmadas.
