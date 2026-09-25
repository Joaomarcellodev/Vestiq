# SPEC-012 — Pedidos de abastecimento (compra direta do fornecedor)

- **Status:** Implementada
- **Sprint:** pós-MVP
- **Requisitos SDD:** RF-ORD-001..006 (novos — evolução "pedidos B2B", SDD §6)
- **Telas:** sem protótipo — segue o padrão de `negociacoes` e `fornecedores`
- **ADRs relacionados:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md), [0008](../../docs/adr/0008-currency-brl.md)
- **Depende de:** [SPEC-011 Fornecedores](../suppliers/SPEC.md)

## Contexto

Com a SPEC-011, a revendedora encontra o catálogo dos fornecedores das suas redes,
mas o pedido ainda sai por fora do Vestiq (mensagem, planilha). O SDD §6 lista
"pedidos B2B" como evolução pós-MVP. Esta spec cobre o **pedido e a resposta da
fábrica**. Despacho, recebimento e entrada no estoque ficam para uma spec futura.

## Problema

A revendedora precisa pedir mercadoria ao fornecedor respeitando o pedido mínimo
e a grade de tamanhos, e saber se o pedido foi aceito. A fábrica precisa receber
esses pedidos em um só lugar.

## Objetivo

- A revendedora monta um pedido para **um** fornecedor, com vários produtos, e
  informa quantidades por cor × tamanho.
- A fábrica confirma ou recusa, com uma justificativa opcional.
- A revendedora pode cancelar enquanto o pedido estiver pendente.
- As duas partes acompanham o pedido e são notificadas a cada mudança.

## Escopo

- Montagem do pedido a partir do catálogo do fornecedor (grade cor × tamanho).
- Validação do pedido mínimo por produto (RF-PROD-007).
- Preço congelado no momento do pedido (snapshot).
- Lista e detalhe de pedidos para a revendedora (enviados) e a fábrica (recebidos).
- Confirmar, recusar e cancelar; notificações.

## Fora do Escopo

- Despacho, recebimento e entrada no estoque da revendedora (spec futura).
- Baixa do estoque da fábrica.
- Pagamento, frete, nota fiscal (SDD §6).
- Edição de um pedido já enviado — cancela-se e faz-se outro.
- Bloqueio por falta de estoque: o pedido é aceito sob encomenda (BR-ORD-05).

## Atores

`RESELLER` faz e cancela pedidos. `FACTORY_ADMIN` (ou `PLATFORM_ADMIN`) do
fornecedor confirma ou recusa.

## Requisitos Relacionados

| RF         | Descrição                                                                     |
| ---------- | ----------------------------------------------------------------------------- |
| RF-ORD-001 | Revendedora faz um pedido a um fornecedor das suas redes, com vários produtos |
| RF-ORD-002 | O pedido respeita o pedido mínimo de cada produto                             |
| RF-ORD-003 | Revendedora e fábrica listam e acompanham seus pedidos                        |
| RF-ORD-004 | Fábrica confirma ou recusa um pedido pendente                                 |
| RF-ORD-005 | Revendedora cancela um pedido pendente                                        |
| RF-ORD-006 | A outra parte é notificada de cada novo pedido e de cada mudança de status    |

## User Stories

| ID        | Como…         | Quero…                                          | Para…                                |
| --------- | ------------- | ----------------------------------------------- | ------------------------------------ |
| US-ORD-01 | RESELLER      | realizar um pedido de abastecimento             | comprar diretamente de um fornecedor |
| US-ORD-02 | FACTORY_ADMIN | confirmar ou recusar pedidos recebidos          | organizar a produção e a expedição   |
| US-ORD-03 | RESELLER      | cancelar um pedido que ainda não foi respondido | corrigir um pedido errado            |

## Regras de Negócio

| ID        | Regra                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-ORD-01 | Um pedido tem um único fornecedor, que precisa ser fornecedor da revenda (BR-SUP-01) no momento do pedido                                                                     |
| BR-ORD-02 | Itens = variações ativas de produtos ativos do fornecedor, com preço > 0; quantidade inteira de 1 a 100.000; até 200 variações por pedido; a mesma variação repetida é somada |
| BR-ORD-03 | Para cada produto do pedido, a soma das peças de todas as variações deve ser ≥ `min_order_quantity`                                                                           |
| BR-ORD-04 | Preço unitário, nome do produto, cor, tamanho e SKU são congelados no item; alterações posteriores no catálogo não mudam o pedido                                             |
| BR-ORD-05 | Variação sem estoque pode ser pedida (sob encomenda); a fábrica decide ao responder                                                                                           |
| BR-ORD-06 | Estados: `PENDING → CONFIRMED`, `PENDING → REJECTED` (fábrica), `PENDING → CANCELLED` (revendedora). Estados finais não mudam                                                 |
| BR-ORD-07 | Observação da revendedora e justificativa da fábrica: até 1.000 caracteres                                                                                                    |
| BR-ORD-08 | Pedidos são criados e alterados só pelas funções transacionais; não há `insert`/`update` direto                                                                               |
| BR-ORD-09 | Total = Σ (preço unitário × quantidade), em BRL                                                                                                                               |

## Fluxo Principal

1. Revendedora abre um fornecedor (ou um produto dele) e toca em **Fazer pedido**.
2. Preenche as quantidades na grade cor × tamanho de um ou mais produtos. Cada
   produto mostra quanto falta para o pedido mínimo, e o resumo mostra peças e total.
3. Adiciona uma observação (opcional) e envia → o pedido nasce `PENDING` e a
   fábrica é notificada.
4. A fábrica abre **Pedidos → Recebidos**, confere e **Confirma** → a revendedora é notificada.

## Fluxos Alternativos

- **Recusar:** a fábrica recusa, com justificativa opcional → `REJECTED`, e a revendedora é notificada.
- **Cancelar:** a revendedora cancela um pedido pendente → `CANCELLED`, e a fábrica é notificada.
- **Pedido mínimo não atingido:** o envio fica desabilitado na tela, e o banco
  recusa com "Pedido mínimo de N peças para <produto>".
- **Revenda saiu da rede:** o envio é recusado ("Fornecedor indisponível"). Os
  pedidos antigos continuam visíveis para as duas partes.

## Estados

```
PENDING ──confirmar (fábrica)──▶ CONFIRMED
   │ └────recusar (fábrica)────▶ REJECTED
   └──────cancelar (revenda)───▶ CANCELLED
```

## Critérios de Aceitação

Ver [`ACCEPTANCE.md`](./ACCEPTANCE.md).

## Modelo de Dados

Migrations `0018_supply_order_notification_types` (novos valores do enum
`notification_type`) e `0019_supply_orders`:

- enum `supply_order_status` (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`);
- `supply_orders` — `reseller_id`, `supplier_id`, `status`, `note`, `response_note`,
  `total_quantity`, `total_amount`, `created_by`, `responded_by`, `responded_at`,
  `cancelled_at`;
- `supply_order_items` — `order_id`, `product_id`, `variant_id` + snapshot
  (`product_name`, `color`, `size`, `sku`, `unit_price`), `quantity`, `line_total`;
- RPCs `list_supplier_order_catalog`, `place_supply_order`, `respond_supply_order`,
  `cancel_supply_order`;
- trigger `notify_supply_order` (RF-ORD-006).

## Segurança

- RLS de `select`: membro da revenda **ou** do fornecedor do pedido. Sem policies
  de escrita (BR-ORD-08).
- `place_supply_order` valida que a usuária é membro da revenda informada e que o
  fornecedor tem essa revenda como membro ativo de uma rede ativa. A revenda vem da
  organização ativa, e o banco revalida.
- `respond_supply_order` exige `FACTORY_ADMIN`/`PLATFORM_ADMIN` do fornecedor.
  `cancel_supply_order` exige ser membro da revenda.
- O catálogo para o pedido segue a SPEC-011: sem `cost_price` e sem quantidade em estoque.
- Funções com `security definer`, `search_path = ''`, e `execute` só para `authenticated`.

## Casos de Erro

| Situação                                 | Resposta esperada                         |
| ---------------------------------------- | ----------------------------------------- |
| Pedido vazio                             | "Adicione ao menos um item"               |
| Produto abaixo do mínimo                 | "Pedido mínimo de N peças para <produto>" |
| Variação de outro fornecedor / arquivada | "Item indisponível"                       |
| Variação sem preço                       | "Item sem preço definido: <produto>"      |
| Fornecedor fora das redes da revenda     | "Fornecedor indisponível"                 |
| Responder/cancelar pedido não pendente   | "Este pedido não está mais pendente"      |
| Revendedora tenta confirmar/recusar      | "not authorized"                          |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [x] Migrations 0018/0019 e tipos regenerados
- [x] `src/features/supply-orders` — validação, regras de pedido mínimo, queries e actions
- [x] Telas `/fornecedores/[id]/pedido`, `/pedidos`, `/pedidos/[id]`
- [x] Navegação, toasts e ícones de notificação
- [x] Testes unitários, de integração, de componente e E2E
