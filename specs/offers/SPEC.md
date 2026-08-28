# SPEC-008 — Ofertas na Rede (Marketplace privado)

- **Status:** Rascunho
- **Sprint:** 4 (Network Marketplace)
- **Requisitos SDD:** RF-OFFER-001..007; SDD §8, §15
- **Telas:** `vestiq_detalhes_da_oferta`, `vestiq_rede_conectada_1/2`, `vestiq_perfil_da_revendedora`
- **ADRs:** [0008](../../docs/adr/0008-currency-brl.md)

## Problema

Uma revendedora quer disponibilizar parte do seu estoque para outras da **mesma
rede**, mantendo privados todos os demais dados. As peças anunciadas circulam na
rede; nada mais.

## Objetivo

Publicar ofertas (produto/variação/quantidade/preço/observação); limitar a
quantidade ao estoque disponível; listar ofertas ativas para peers da rede;
cancelar oferta não negociada; atualizar a quantidade conforme negociações
concluídas.

## Escopo

- `offers` + policies (dono + peers da rede veem `ACTIVE`).
- Publicação a partir de uma variação do estoque próprio.
- Feed/diretório de ofertas da rede com busca e filtros.
- Detalhe da oferta (preço de transferência B2B, origem, descrição) com CTA
  "Solicitar Negociação" (abre a feature `negotiations`).
- Cancelamento pela dona.

## Fora do Escopo

- Marketplace público / entre redes diferentes (SDD §6).
- Reserva de estoque na publicação (a oferta **não** reserva; disponibilidade é
  checada na conclusão da negociação).
- Pagamento na plataforma.

## Atores

`RESELLER` (ofertante e interessada).

## Requisitos Relacionados

| RF           | Descrição                                                                 |
| ------------ | ------------------------------------------------------------------------- |
| RF-OFFER-001 | Disponibilizar parte do estoque para negociação                           |
| RF-OFFER-002 | Oferta: produto, variação, quantidade, preço/condição, observação, status |
| RF-OFFER-003 | Quantidade anunciada ≤ estoque disponível                                 |
| RF-OFFER-004 | Revendedoras da mesma rede veem ofertas ativas                            |
| RF-OFFER-005 | Ofertas de outras redes não são acessíveis                                |
| RF-OFFER-006 | A proprietária pode cancelar oferta não negociada                         |
| RF-OFFER-007 | Quantidade ofertada é atualizada quando há negociação concluída           |

## User Stories

| ID          | Como…    | Quero…                                   | Para…                        |
| ----------- | -------- | ---------------------------------------- | ---------------------------- |
| US-OFFER-01 | RESELLER | anunciar X unidades de uma peça parada   | encontrar quem tenha demanda |
| US-OFFER-02 | RESELLER | ver as ofertas da minha rede com filtros | achar o que preciso          |
| US-OFFER-03 | RESELLER | abrir os detalhes de uma oferta          | avaliar antes de negociar    |
| US-OFFER-04 | RESELLER | cancelar uma oferta que não quero mais   | tirar do ar                  |

## Regras de Negócio

| ID          | Regra                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-OFFER-01 | Oferta referencia uma `product_variant` da própria organização e a `network_id` de uma rede em que ela é membro ativo                                             |
| BR-OFFER-02 | `quantity_offered ≤ product_variants.stock_on_hand` no momento da publicação (RF-OFFER-003)                                                                       |
| BR-OFFER-03 | A oferta **não** decrementa estoque; só a conclusão de negociação move estoque                                                                                    |
| BR-OFFER-04 | `quantity_remaining` começa igual a `quantity_offered` e é decrementada a cada negociação `COMPLETED` (RF-OFFER-007)                                              |
| BR-OFFER-05 | `status`: `ACTIVE` → `PARTIALLY_NEGOTIATED` (0 < remaining < offered) → `FULFILLED` (remaining = 0) / `CANCELLED`                                                 |
| BR-OFFER-06 | Cancelar só é permitido se não houver negociação `ACCEPTED`/`COMPLETED` em curso (RF-OFFER-006); negociações `PENDING` são rejeitadas automaticamente ao cancelar |
| BR-OFFER-07 | Peers veem apenas ofertas `ACTIVE`/`PARTIALLY_NEGOTIATED` da **mesma** rede; nunca de outra (RF-OFFER-004/005)                                                    |
| BR-OFFER-08 | Peers **não** veem estoque real, custo, nem quanto a dona ainda tem — só `quantity_remaining` e `transfer_price` (SDD §8)                                         |
| BR-OFFER-09 | Se o estoque cair abaixo de `quantity_remaining` (venda local), a oferta é sinalizada e a conclusão de negociação revalida o saldo                                |
| BR-OFFER-10 | Variação arquivada não pode ser ofertada; oferta vira `CANCELLED` se a variação for arquivada                                                                     |

## Fluxos

**Publicar:** a partir do detalhe do produto → escolher variação, quantidade
(≤ saldo), preço de transferência, observação, rede → `offers` `ACTIVE`.

**Descobrir:** feed de ofertas da rede (cards) → filtros (marca, categoria,
tamanho, preço) → detalhe → "Solicitar Negociação".

**Cancelar:** dona → confirma → `CANCELLED` (rejeita propostas pendentes).

## Estados

`ACTIVE → PARTIALLY_NEGOTIATED → FULFILLED` · qualquer → `CANCELLED` (regras acima).

## Segurança

- `offers`: policy de leitura = `is_org_member(organization_id)` OU
  (`status in ('ACTIVE','PARTIALLY_NEGOTIATED')` E peer da mesma rede). Escrita só
  pela dona.
- Projeção para peers via view/`queries` que expõe apenas campos públicos.

## Casos de Erro

| Situação                            | Resposta                                             |
| ----------------------------------- | ---------------------------------------------------- |
| Quantidade > saldo                  | "Você tem apenas N em estoque"                       |
| Rede em que não é membro            | recusado                                             |
| Cancelar com negociação aceita      | "Há uma negociação em andamento; conclua ou aguarde" |
| Peer acessando oferta de outra rede | 404 / RLS vazio                                      |
| Ofertar variação arquivada          | "Produto indisponível"                               |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migration `offers` + policies (dono + peer da rede) + enum de status
- [ ] Actions: `publishOffer`, `cancelOffer`; recalculo de `quantity_remaining`/`status`
- [ ] `queries`: `listNetworkOffers` (filtros), `getOfferForViewer` (projeção pública)
- [ ] Telas: feed da rede, detalhe da oferta, publicar oferta (a partir do produto)
- [ ] Testes: limite de quantidade, RLS entre redes, projeção sem dados privados, transições de status
