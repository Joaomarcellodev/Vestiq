# SPEC-007 — Vendas

- **Status:** Rascunho
- **Sprint:** 3 (Operations)
- **Requisitos SDD:** RF-SALE-001..009; SDD §14
- **Telas:** `vestiq_registrar_venda`, `vestiq_vendas`
- **ADRs:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md),
  [0005](../../docs/adr/0005-inventory-balance-from-movements.md),
  [0008](../../docs/adr/0008-currency-brl.md)

## Problema

A revendedora registra vendas com múltiplos itens, desconto e forma de pagamento;
a confirmação deve baixar o estoque atomicamente e o cancelamento deve estornar,
sempre preservando o histórico.

## Objetivo

Registrar venda (multi-item, desconto, pagamento); confirmar → baixa de estoque
transacional; bloquear venda acima do disponível; cancelar → estorno + histórico.

## Escopo

- `sales`, `sale_items` + policies.
- RPC `confirm_sale(payload)` e `cancel_sale(sale_id, reason)`.
- Tela "Registrar Venda": seleção de cliente, busca de produto no estoque, itens
  com quantidade, método de pagamento (Pix/Cartão/Dinheiro), resumo financeiro
  (subtotal, desconto, total).
- Tela "Vendas": resumo (faturamento, gráfico simples) + transações recentes.
- Cancelamento de venda a partir do detalhe.

## Fora do Escopo

- Gateway/So split de pagamento, emissão fiscal (SDD §6).
- Devolução parcial de itens (só cancelamento total no MVP).
- Leitor de código de barras ("Escanear" desabilitado).

## Atores

`RESELLER`.

## Requisitos Relacionados

| RF          | Descrição                                            |
| ----------- | ---------------------------------------------------- |
| RF-SALE-001 | Registrar vendas                                     |
| RF-SALE-002 | Venda com múltiplos itens                            |
| RF-SALE-003 | Item identifica produto, variação, quantidade, preço |
| RF-SALE-004 | Registrar desconto                                   |
| RF-SALE-005 | Registrar forma de pagamento                         |
| RF-SALE-006 | Confirmação atualiza o estoque                       |
| RF-SALE-007 | Bloquear venda acima do estoque disponível           |
| RF-SALE-008 | Venda cancelada permanece no histórico               |
| RF-SALE-009 | Cancelamento estorna unidades ao estoque             |

## User Stories

| ID         | Como…    | Quero…                                     | Para…                                  |
| ---------- | -------- | ------------------------------------------ | -------------------------------------- |
| US-SALE-01 | RESELLER | registrar uma venda com vários itens       | fechar o pedido                        |
| US-SALE-02 | RESELLER | aplicar um desconto no total               | negociar com o cliente                 |
| US-SALE-03 | RESELLER | escolher a forma de pagamento              | registrar como recebi                  |
| US-SALE-04 | RESELLER | que o estoque baixe ao confirmar           | manter o saldo correto                 |
| US-SALE-05 | RESELLER | cancelar uma venda                         | corrigir um erro sem perder o registro |
| US-SALE-06 | RESELLER | ver minhas vendas recentes e o faturamento | acompanhar o negócio                   |

## Regras de Negócio

| ID         | Regra                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-SALE-01 | Venda tem 1..N itens; cada item referencia `product_variant` + `quantity > 0` + `unit_price` (preço no momento)                                                                               |
| BR-SALE-02 | `subtotal = Σ line_total`; `total = subtotal - discount`; `discount ∈ [0, subtotal]`                                                                                                          |
| BR-SALE-03 | `payment_method ∈ {PIX, CARTAO, DINHEIRO}`                                                                                                                                                    |
| BR-SALE-04 | `confirm_sale` é transacional: cria `sales` + `sale_items` + N movimentos `VENDA` (negativos) + atualiza `stock_on_hand`; se **qualquer** item exceder o saldo, aborta tudo (RF-SALE-006/007) |
| BR-SALE-05 | Item de variação arquivada não pode ser vendido                                                                                                                                               |
| BR-SALE-06 | Cancelar: `status = CANCELLED`, `cancelled_at`, `cancel_reason`; cria movimentos `CANCELAMENTO` (positivos) estornando cada item; transacional (RF-SALE-008/009)                              |
| BR-SALE-07 | Venda cancelada não pode ser recancelada nem editada                                                                                                                                          |
| BR-SALE-08 | Cliente é opcional (venda avulsa)                                                                                                                                                             |
| BR-SALE-09 | Preço do item é congelado; alterar o preço do produto depois não muda a venda                                                                                                                 |
| BR-SALE-10 | Faturamento do resumo considera apenas `CONFIRMED`                                                                                                                                            |

## Fluxos

**Registrar:** (opcional) escolher cliente → buscar produto no estoque, adicionar
itens (ajustar quantidade) → escolher pagamento → revisar resumo, informar
desconto → "Confirmar Venda" → RPC `confirm_sale`.

**Cancelar:** abrir venda → "Cancelar" + motivo → RPC `cancel_sale`.

## Estados

`sales.status`: `CONFIRMED → CANCELLED` (terminal).

## Segurança

- `sales`/`sale_items`: `is_org_member(organization_id)`.
- RPCs `security definer`, revalidam a organização do usuário e das variações,
  rodam em transação, `raise exception` para abortar.
- Nenhuma baixa de estoque fora da RPC.

## Casos de Erro

| Situação                               | Resposta                                                              |
| -------------------------------------- | --------------------------------------------------------------------- |
| Item com quantidade > saldo            | "Estoque insuficiente para <produto> (disponível N)" — nada é gravado |
| Venda sem itens                        | "Adicione ao menos um item"                                           |
| Desconto > subtotal                    | "Desconto maior que o subtotal"                                       |
| Variação arquivada no carrinho         | "Produto indisponível"                                                |
| Cancelar venda já cancelada            | "Venda já cancelada"                                                  |
| Concorrência (2 vendas do mesmo saldo) | a segunda falha na RPC (checagem sob transação)                       |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migrations `sales`, `sale_items` + policies
- [ ] RPC `confirm_sale`, `cancel_sale` (transacionais, com estorno)
- [ ] `validation.ts` (payload de venda) + cálculo de totais (`utils`)
- [ ] Tela registrar venda (seleção de cliente/produto, itens, pagamento, resumo)
- [ ] Tela de vendas (resumo + transações) + detalhe/cancelamento
- [ ] Testes: rollback em falha parcial, bloqueio de negativo, estorno, concorrência, RLS
