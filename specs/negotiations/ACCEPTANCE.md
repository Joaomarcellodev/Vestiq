# ACCEPTANCE — Negociação

## AC-NEG-001-01 — Enviar proposta

**Dado** uma oferta `ACTIVE` de 4 unidades da revendedora A na rede X
**Quando** a revendedora B envia uma proposta de 2 unidades por R$ 1.450,00 com mensagem
**Então** existe uma `negotiations` `PENDING` (buyer B, seller A, offer, quantity 2, amount 1450)
**E** há um `negotiation_events` `CREATED`.

## AC-NEG-002-01 — Dados da proposta

**Então** a negociação registra interessada, vendedora, oferta, quantidade, valor,
mensagem opcional e status.

## AC-NEG-002-02 — Quantidade indisponível

**Dado** uma oferta com `quantity_remaining = 1`
**Quando** B propõe 3
**Então** recebe "Quantidade indisponível (restam 1)".

## AC-NEG-003-01 — Estados suportados

**Então** `status ∈ {PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED}`.

## AC-NEG-004-01 — Vendedora aceita

**Dado** uma proposta `PENDING`
**Quando** a vendedora A aceita
**Então** `status = ACCEPTED`
**E** há evento `ACCEPTED`.

## AC-NEG-004-02 — Vendedora rejeita

**Quando** a vendedora A rejeita a proposta `PENDING`
**Então** `status = REJECTED` (terminal)
**E** há evento `REJECTED`.

## AC-NEG-004-03 — Só a vendedora decide

**Quando** a compradora B tenta aceitar a própria proposta
**Então** a ação é recusada.

## AC-NEG-005-01 — Compradora cancela pendente

**Dado** uma proposta `PENDING`
**Quando** a compradora B a cancela
**Então** `status = CANCELLED`
**E** há evento `CANCELLED`.

## AC-NEG-005-02 — Não cancela pendente alheia

**Quando** uma terceira revendedora tenta cancelar a proposta de B
**Então** recusado (RLS — nem enxerga a negociação).

## AC-NEG-006-01 — Concluir aceita

**Dado** uma negociação `ACCEPTED` de 2 unidades e saldo 5 na origem
**Quando** a vendedora A conclui
**Então** `status = COMPLETED` com `completed_at`.

## AC-NEG-007-01 — Movimentos de transferência

**Dado** a conclusão da negociação acima
**Então** há `TRANSFERENCIA_SAIDA` de −2 no estoque de A
**E** `TRANSFERENCIA_ENTRADA` de +2 no estoque de B
**E** o saldo de A cai para 3 e o de B sobe em 2
**E** `offer.quantity_remaining` diminui em 2.

## AC-NEG-007-02 — Mesma operação transacional

**Então** os dois movimentos e as atualizações de saldo/oferta ocorrem na mesma transação.

## AC-NEG-008-01 — Falha parcial não persiste nada

**Dado** que a gravação da `TRANSFERENCIA_ENTRADA` falhe
**Então** a `TRANSFERENCIA_SAIDA` também é desfeita
**E** nenhum saldo muda
**E** a negociação permanece `ACCEPTED`.

## AC-NEG-008-02 — Estoque insuficiente na origem

**Dado** uma negociação `ACCEPTED` de 5 unidades e saldo 3 na origem (venda local no meio)
**Quando** a vendedora tenta concluir
**Então** recebe "Estoque insuficiente na origem"
**E** a negociação continua `ACCEPTED`
**E** nenhum movimento é criado.

## AC-NEG-009-01 — Histórico preservado

**Dado** uma negociação `COMPLETED` com 5 eventos
**Quando** qualquer parte abre a negociação
**Então** vê os 5 eventos em ordem cronológica
**E** o registro permanece após a conclusão.

## AC-NEG-transicao — Transição ilegal

**Dado** uma negociação `PENDING`
**Quando** se tenta `PENDING → COMPLETED` diretamente
**Então** a operação é recusada.
