# ACCEPTANCE — Ofertas

## AC-OFFER-001-01 — Publicar oferta

**Dado** uma variação com saldo 8
**Quando** a revendedora publica uma oferta de 4 unidades a R$ 28.500,00 na rede X
**Então** existe uma `offers` `ACTIVE` com `quantity_offered = 4`, `quantity_remaining = 4`
**E** o saldo da variação continua 8 (não há reserva).

## AC-OFFER-002-01 — Campos da oferta

**Então** a oferta registra produto, variação, quantidade, preço de transferência,
observação e status.

## AC-OFFER-003-01 — Quantidade limitada ao estoque

**Dado** uma variação com saldo 3
**Quando** a revendedora tenta ofertar 5
**Então** recebe "Você tem apenas 3 em estoque"
**E** a oferta não é criada.

## AC-OFFER-004-01 — Peers da mesma rede veem ofertas ativas

**Dado** as revendedoras A e B na rede X, e uma oferta `ACTIVE` de A
**Quando** B abre o feed da rede X
**Então** vê a oferta de A.

## AC-OFFER-005-01 — Isolamento entre redes

**Dado** uma oferta de A na rede X e uma revendedora C na rede Y
**Quando** C busca ofertas
**Então** não vê a oferta de A.

## AC-OFFER-privacidade — Sem dados privados

**Dado** B visualizando a oferta de A
**Então** vê `quantity_remaining` e `transfer_price`
**E não** vê o estoque real de A, o custo, nem clientes/vendas de A.

## AC-OFFER-006-01 — Cancelar oferta não negociada

**Dado** uma oferta `ACTIVE` sem negociações aceitas
**Quando** a dona cancela
**Então** `status = CANCELLED`
**E** eventuais propostas `PENDING` são marcadas `REJECTED`.

## AC-OFFER-006-02 — Cancelamento bloqueado com negociação aceita

**Dado** uma oferta com uma negociação `ACCEPTED`
**Quando** a dona tenta cancelar
**Então** recebe "Há uma negociação em andamento".

## AC-OFFER-007-01 — Quantidade atualiza após conclusão

**Dado** uma oferta com `quantity_remaining = 4`
**Quando** uma negociação de 3 unidades é concluída
**Então** `quantity_remaining = 1`
**E** `status = PARTIALLY_NEGOTIATED`
**E quando** a última unidade é negociada, `status = FULFILLED`.

## AC-OFFER-arquivada — Variação arquivada

**Dado** uma oferta ativa cuja variação é arquivada
**Então** a oferta passa a `CANCELLED`.
