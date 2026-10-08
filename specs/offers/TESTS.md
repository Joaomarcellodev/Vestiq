# TESTS — Ofertas

## Matriz de rastreabilidade

| RF               | AC                   | TC          | Nível                 | Crítica §38       |
| ---------------- | -------------------- | ----------- | --------------------- | ----------------- |
| RF-OFFER-001     | AC-OFFER-001-01      | TC-OFFER-01 | integration           | não               |
| RF-OFFER-002     | AC-OFFER-002-01      | TC-OFFER-02 | integration           | não               |
| RF-OFFER-003     | AC-OFFER-003-01      | TC-OFFER-03 | integration           | sim (estoque)     |
| RF-OFFER-004     | AC-OFFER-004-01      | TC-OFFER-04 | integration           | sim (isolamento)  |
| RF-OFFER-005     | AC-OFFER-005-01      | TC-OFFER-05 | integration (2 redes) | sim (isolamento)  |
| RF-OFFER-004/005 | AC-OFFER-privacidade | TC-OFFER-06 | integration           | sim (privacidade) |
| RF-OFFER-006     | AC-OFFER-006-01      | TC-OFFER-07 | integration           | não               |
| RF-OFFER-006     | AC-OFFER-006-02      | TC-OFFER-08 | integration           | não               |
| RF-OFFER-007     | AC-OFFER-007-01      | TC-OFFER-09 | integration           | sim               |
| RF-OFFER-003     | AC-OFFER-arquivada   | TC-OFFER-10 | integration           | não               |
| RF-OFFER-004     | AC-OFFER-004-02      | TC-OFFER-11 | integration           | sim (privacidade) |
| RF-OFFER-004     | AC-OFFER-busca       | TC-OFFER-12 | unit + e2e            | não               |
| RF-OFFER-008     | AC-OFFER-008-01      | TC-OFFER-13 | integration + e2e     | não               |
| RF-OFFER-008     | AC-OFFER-008-02      | TC-OFFER-14 | integration + comp.   | sim (autorização) |
| RF-OFFER-008     | AC-OFFER-008-03      | TC-OFFER-15 | integration           | não               |

## Casos de teste

### TC-OFFER-01 — Publicar não reserva estoque

integration · oferta `ACTIVE`; `stock_on_hand` inalterado; `quantity_remaining = quantity_offered`.

### TC-OFFER-02 — Campos obrigatórios da oferta

integration · faltando preço/quantidade → erro; oferta completa persistida.

### TC-OFFER-03 — Limite pela disponibilidade

integration · **crítica** · `quantity_offered > stock_on_hand` → recusado.

### TC-OFFER-04 — Peer da rede enxerga

integration · **crítica (isolamento)** · B (mesma rede) vê oferta `ACTIVE` de A.

### TC-OFFER-05 — Rede alheia não enxerga

integration (2 redes) · **crítica (RF-OFFER-005)** · C da rede Y → `select` em ofertas de X = 0 linhas.

### TC-OFFER-06 — Projeção pública sem dados privados

integration · **crítica (SDD §8)** · `getOfferForViewer` como peer não retorna `stock_on_hand`, `cost_price`, nem dados de clientes/vendas; queries diretas nessas tabelas do dono → vazio.

### TC-OFFER-07 — Cancelar rejeita pendentes

integration · oferta `ACTIVE` + 2 propostas `PENDING` → cancelar → oferta `CANCELLED`, propostas `REJECTED`.

### TC-OFFER-08 — Cancelamento bloqueado

integration · negociação `ACCEPTED` presente → cancelar recusado.

### TC-OFFER-09 — quantity_remaining e status pós-conclusão

integration · **crítica** · concluir 3 de 4 → remaining 1, `PARTIALLY_NEGOTIATED`; concluir a última → `FULFILLED`.

### TC-OFFER-10 — Variação arquivada cancela oferta

integration · arquivar variação → oferta `CANCELLED`.

### TC-OFFER-11 — Projeção pública da oferta

integration · **crítica (SDD §8)** · `list_visible_offers` como peer devolve nome, marca, descrição, cor/tamanho e fotos, sem `cost_price`, `retail_price`, `stock_on_hand` nem `sku`; outsider → nada; oferta `CANCELLED` some para peers e continua para a dona. `listNetworkOffers`/`getOffer` como peer trazem o produto.

### TC-OFFER-12 — Busca do feed

unit · `matchesOfferQuery`: todas as palavras, sem caixa/acentos, em produto, marca, cor/tamanho ou revendedora · unit · `OfferCard` mostra a foto ou o ícone · e2e · peer busca "chanel PRETO" → acha a bolsa; busca sem resultado → estado vazio.

### TC-OFFER-13 — Publicar com fotos

integration + e2e · não-crítica · fotos gravadas em `offers.image_urls` (pasta `<org>/offers/`); RPC falha → arquivos removidos; peer vê a foto no feed (E2E).

### TC-OFFER-14 — Editar fotos da oferta

integration + component · **crítica (autorização)** · capa reordenada, foto removida apagada do Storage, URL alheia ignorada; oferta cancelada → erro; outra organização → erro, nada muda.

### TC-OFFER-15 — Fallback para as fotos do produto

integration · não-crítica · `list_visible_offers` devolve as fotos da oferta quando houver e as do produto quando não.

## Cobertura de RF

`RF-OFFER-001..008` ✔
