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

## AC-OFFER-003-02 — Ofertas da mesma variação dividem o estoque

**Dado** uma variação com saldo 5 e uma oferta ativa de 3 unidades
**Quando** a revendedora tenta publicar outra oferta de 3 da mesma variação
**Então** recebe "Estoque livre insuficiente (2 disponível, o restante já está em ofertas ativas)"
**E** uma oferta de 2 é aceita
**E** duas publicações simultâneas que juntas passem do saldo resultam em apenas uma oferta.

## AC-OFFER-003-03 — Venda local reduz as ofertas

**Dado** uma variação com saldo 5, uma oferta antiga de 2 e uma nova de 3
**Quando** a revendedora vende 2 unidades na loja
**Então** a oferta nova cai para 1 e a antiga continua com 2
**E** quando o saldo não comporta mais uma oferta, ela vira `CANCELLED`.

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

## AC-OFFER-004-02 — Foto e produto visíveis para a rede (VES-23)

**Dado** a revendedora B na mesma rede de A, e uma oferta de A cujo produto tem foto
**Quando** B abre o feed da rede ou o detalhe da oferta
**Então** vê o nome, a marca, a cor/tamanho e a foto do produto
**E não** vê custo, preço de varejo, estoque real nem SKU de A.

## AC-OFFER-busca — Busca no feed da rede (VES-23)

**Dado** o feed da rede com ofertas
**Quando** a revendedora busca por palavras (peça, marca, cor, tamanho ou revendedora)
**Então** vê só as ofertas que contêm todas as palavras, sem diferenciar maiúsculas nem acentos, com a foto do produto
**E** com nenhuma oferta correspondente, vê "Nenhuma oferta encontrada".

## AC-OFFER-008-01 — Fotos ao publicar

**Dado** uma revendedora publicando uma oferta
**Quando** ela envia até 5 fotos (JPG, PNG ou WebP, até 5 MB, comprimidas no navegador)
**Então** as fotos ficam na oferta e aparecem no feed, na busca e no detalhe para as revendedoras da rede
**E** se a publicação falhar, as fotos enviadas são apagadas.

## AC-OFFER-008-02 — Editar as fotos da oferta

**Dado** uma oferta ativa ou parcialmente negociada da revendedora
**Quando** ela abre o detalhe da oferta
**Então** pode adicionar fotos, remover fotos e escolher a capa
**E** as fotos removidas são apagadas do Storage
**E** oferta cancelada ou concluída não pode ter as fotos alteradas
**E** outra organização não altera as fotos.

## AC-OFFER-008-03 — Sem fotos próprias

**Dado** uma oferta sem fotos próprias
**Então** ela mostra as fotos do produto, como antes.
