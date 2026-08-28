# SPEC-009 — Negociação e Transferência de Estoque

- **Status:** Rascunho
- **Sprint:** 5 (Negotiations)
- **Requisitos SDD:** RF-NEG-001..009; SDD §16, §33 (exemplo de AC)
- **Telas:** `vestiq_negocia_es`, `vestiq_chat_de_negocia_o`
- **ADRs:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md),
  [0007](../../docs/adr/0007-negotiation-events-not-realtime.md)

## Problema

Sobre uma oferta, uma revendedora envia proposta; a dona aceita ou recusa; a
interessada pode cancelar enquanto pendente; ao concluir, o estoque é transferido
entre as duas de forma **transacional** e o histórico é preservado.

## Objetivo

Fluxo completo de negociação com máquina de estados, timeline de eventos
(mensagens + ações) e transferência de estoque atômica na conclusão.

## Escopo

- `negotiations`, `negotiation_events` + policies (só as duas partes).
- RPC `complete_negotiation` (transferência transacional).
- Actions: `openNegotiation` (proposta), `acceptNegotiation`, `rejectNegotiation`,
  `cancelNegotiation`, `completeNegotiation`, `postNegotiationMessage`.
- Tela "Painel de Negociações" (abas Recebidas / Enviadas, ações rápidas).
- Tela de negociação (timeline de eventos + card de proposta + envio de mensagem).

## Fora do Escopo

- Chat em tempo real (ADR-0007 — timeline com refetch).
- Contraproposta com múltiplas rodadas de preço (MVP: uma proposta por negociação;
  recusar e abrir outra). Registrar como melhoria pós-MVP.
- Pagamento/repasse financeiro entre revendedoras (SDD §6).

## Atores

`RESELLER` vendedora (dona da oferta) e `RESELLER` compradora (interessada).

## Requisitos Relacionados

| RF         | Descrição                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------- |
| RF-NEG-001 | Enviar proposta sobre uma oferta                                                               |
| RF-NEG-002 | Proposta registra interessada, vendedora, oferta, quantidade, valor, mensagem opcional, status |
| RF-NEG-003 | Estados: PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED                                     |
| RF-NEG-004 | Proprietária aceita ou rejeita                                                                 |
| RF-NEG-005 | Interessada cancela proposta pendente                                                          |
| RF-NEG-006 | Negociação aceita pode ser marcada como concluída                                              |
| RF-NEG-007 | Conclusão gera TRANSFERENCIA_SAIDA (origem) e TRANSFERENCIA_ENTRADA (destino)                  |
| RF-NEG-008 | Operação transacional: se uma movimentação falhar, nenhuma persiste                            |
| RF-NEG-009 | Histórico da negociação permanece armazenado                                                   |

## User Stories

| ID        | Como…      | Quero…                                | Para…                               |
| --------- | ---------- | ------------------------------------- | ----------------------------------- |
| US-NEG-01 | compradora | enviar proposta por uma oferta        | iniciar a negociação                |
| US-NEG-02 | compradora | cancelar minha proposta pendente      | desistir sem ruído                  |
| US-NEG-03 | vendedora  | aceitar ou recusar uma proposta       | decidir a transferência             |
| US-NEG-04 | vendedora  | concluir uma negociação aceita        | efetivar a transferência de estoque |
| US-NEG-05 | ambas      | trocar mensagens dentro da negociação | alinhar detalhes                    |
| US-NEG-06 | ambas      | ver o histórico da negociação         | ter registro do combinado           |

## Regras de Negócio

| ID        | Regra                                                                                                                                                                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-NEG-01 | Proposta referencia uma oferta `ACTIVE`/`PARTIALLY_NEGOTIATED` de outra organização da mesma rede                                                                                                                                                                                                                                                                                     |
| BR-NEG-02 | `quantity ≤ offer.quantity_remaining` no momento da proposta; `amount > 0`                                                                                                                                                                                                                                                                                                            |
| BR-NEG-03 | Compradora ≠ vendedora; ambas membros ativos da mesma rede                                                                                                                                                                                                                                                                                                                            |
| BR-NEG-04 | Transições válidas: `PENDING→ACCEPTED`, `PENDING→REJECTED` (vendedora), `PENDING→CANCELLED` (compradora), `ACCEPTED→COMPLETED` (vendedora), `ACCEPTED→CANCELLED` (qualquer parte, antes de concluir). Qualquer outra é erro                                                                                                                                                           |
| BR-NEG-05 | Só a vendedora aceita/rejeita/conclui; só a compradora cancela proposta pendente; ambas podem cancelar uma aceita                                                                                                                                                                                                                                                                     |
| BR-NEG-06 | `complete_negotiation` (transacional): revalida estado `ACCEPTED`, revalida `stock_on_hand(origem) ≥ quantity`, cria `TRANSFERENCIA_SAIDA` (origem, −q) e `TRANSFERENCIA_ENTRADA` (destino, +q), atualiza os dois `stock_on_hand`, decrementa `offer.quantity_remaining` e ajusta `offer.status`, grava evento `COMPLETED`. Falha em qualquer passo → rollback total (RF-NEG-007/008) |
| BR-NEG-07 | A variação no destino: se a compradora já tem a mesma `product_variant` (mesmo produto/tamanho/cor)? No MVP, cria-se uma variação no catálogo da compradora vinculada ao produto correspondente (ou novo produto "recebido via rede") — decisão detalhada em `ADR.md` local                                                                                                           |
| BR-NEG-08 | Toda ação e mensagem gera um `negotiation_events` (append-only) — o histórico é a própria trilha (RF-NEG-009)                                                                                                                                                                                                                                                                         |
| BR-NEG-09 | Negociação em estado terminal (`REJECTED`, `CANCELLED`, `COMPLETED`) é imutável, exceto novas mensagens? Não: após terminal, sem novas mensagens                                                                                                                                                                                                                                      |
| BR-NEG-10 | Se `stock_on_hand(origem) < quantity` na conclusão (venda local no meio), a conclusão falha com mensagem clara e a negociação continua `ACCEPTED`                                                                                                                                                                                                                                     |

## Fluxos

**Proposta:** compradora, no detalhe da oferta → quantidade + valor + mensagem →
`negotiations` `PENDING` + evento `CREATED`.

**Aceite/recusa:** vendedora no painel → ação → estado + evento.

**Conclusão:** vendedora → `complete_negotiation` → transferência transacional.

**Mensagens:** qualquer parte → evento `MESSAGE`; tela recarrega a timeline.

## Estados

Ver máquina em `docs/DATA_MODEL.md` (§ Máquina de estados — negotiations).

## Segurança

- `negotiations`/`negotiation_events`: `select`/`insert` só para membros de
  `seller_org_id` ou `buyer_org_id`.
- Ações verificam o papel (vendedora vs compradora) além da associação.
- `complete_negotiation` `security definer`, transacional, revalida tudo.

## Casos de Erro

| Situação                                    | Resposta                                                       |
| ------------------------------------------- | -------------------------------------------------------------- |
| Proposta com quantidade > remaining         | "Quantidade indisponível (restam N)"                           |
| Aceitar proposta de negociação alheia       | recusado (RLS/So papel)                                        |
| Concluir negociação não aceita              | "A negociação precisa estar aceita"                            |
| Concluir com estoque insuficiente na origem | "Estoque insuficiente na origem" — estado permanece `ACCEPTED` |
| Falha parcial na transferência              | rollback: nenhum movimento, nenhum saldo alterado              |
| Cancelar negociação já concluída            | "Negociação já concluída"                                      |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] `ADR.md` local: como a variação recebida entra no catálogo da compradora
- [ ] Migrations `negotiations`, `negotiation_events` + policies
- [ ] Função `negotiation_transition()` (guardas de estado) + `complete_negotiation` (transacional)
- [ ] Actions: proposta, aceitar, rejeitar, cancelar, concluir, mensagem
- [ ] Telas: painel (Recebidas/Enviadas) e negociação (timeline + card + input)
- [ ] Testes: toda transição legal/ilegal, transferência transacional, rollback, RLS, concorrência com venda local
