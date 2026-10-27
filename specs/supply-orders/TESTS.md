# TESTS — Pedidos de abastecimento

## Matriz de rastreabilidade

| RF              | AC                           | TC                   | Nível              | Arquivo                                                        |
| --------------- | ---------------------------- | -------------------- | ------------------ | -------------------------------------------------------------- |
| RF-ORD-001      | AC-ORD-001-01                | TC-ORD-01            | integration        | `src/features/supply-orders/supply-orders.integration.test.ts` |
| RF-ORD-001      | AC-ORD-001-02                | TC-ORD-02            | integration        | idem                                                           |
| RF-ORD-001      | AC-ORD-001-03                | TC-ORD-03            | integration        | idem                                                           |
| RF-ORD-002      | AC-ORD-002-01                | TC-ORD-04, TC-ORD-05 | unit + integration | `order-math.test.ts`, idem                                     |
| RF-ORD-003      | AC-ORD-003-01                | TC-ORD-06            | integration        | idem                                                           |
| RF-ORD-004      | AC-ORD-004-01..03            | TC-ORD-07, TC-ORD-08 | integration        | idem                                                           |
| RF-ORD-005      | AC-ORD-005-01, AC-ORD-005-02 | TC-ORD-09, TC-ORD-10 | unit + integration | `state.test.ts`, idem                                          |
| RF-ORD-006      | AC-ORD-006-01                | TC-ORD-11            | integration        | idem                                                           |
| RF-ORD-007      | AC-ORD-007-01                | TC-ORD-13, TC-ORD-14 | unit + integration | `state.test.ts`, `supply-orders.integration.test.ts`           |
| RF-ORD-008      | AC-ORD-008-01                | TC-ORD-13, TC-ORD-14 | unit + integration | idem                                                           |
| RF-ORD-001..004 | AC-ORD-001-01, AC-ORD-004-01 | TC-ORD-12            | e2e                | `e2e/supply-orders.spec.ts`                                    |

## Casos de teste

### TC-ORD-01 — Pedido com vários produtos

- **Nível:** integration
- **Passos:** `placeSupplyOrder` com 2 produtos, variação repetida no payload
- **Resultado esperado:** 1 pedido `PENDING`; itens somados por variação; `total_quantity` e `total_amount` corretos; snapshot de nome/cor/tamanho/SKU/preço
- **Regra crítica (SDD §38):** sim

### TC-ORD-02 — Fornecedor fora das redes / variação alheia / arquivada / sem preço

- **Nível:** integration
- **Resultado esperado:** "Fornecedor indisponível", "Item indisponível", "Item sem preço definido"; nenhum pedido gravado
- **Regra crítica (SDD §38):** sim

### TC-ORD-03 — Preço congelado

- **Nível:** integration
- **Passos:** pedir; mudar `retail_price` da variação; reler o pedido
- **Resultado esperado:** `unit_price` e total inalterados

### TC-ORD-04 — Cálculo do pedido mínimo e totais (cliente)

- **Nível:** unit
- **Resultado esperado:** `summarizeOrder` aponta faltantes por produto, ignora produtos sem quantidade e soma peças/total

### TC-ORD-05 — Pedido mínimo no banco

- **Nível:** integration
- **Resultado esperado:** abaixo do mínimo → "Pedido mínimo de 12 peças para …"

### TC-ORD-06 — Visibilidade dos pedidos

- **Nível:** integration
- **Resultado esperado:** revenda vê "enviados", fábrica vê "recebidos"; outra revenda e outra fábrica não veem; `insert` direto na tabela é negado
- **Regra crítica (SDD §38):** sim

### TC-ORD-07 — Fábrica confirma / recusa com justificativa

- **Nível:** integration
- **Resultado esperado:** status muda; `response_note`, `responded_at` gravados

### TC-ORD-08 — Revendedora não responde

- **Nível:** integration
- **Resultado esperado:** `respond_supply_order` pela revendedora → negado

### TC-ORD-09 — Cancelar pendente

- **Nível:** integration
- **Resultado esperado:** `CANCELLED`, `cancelled_at` gravado; fábrica não cancela

### TC-ORD-10 — Estados finais

- **Nível:** unit + integration
- **Resultado esperado:** `availableActions` vazio para estados finais; RPC → "Este pedido não está mais pendente"

### TC-ORD-11 — Notificações

- **Nível:** integration
- **Resultado esperado:** novo pedido → fábrica; confirmação/recusa → revenda; cancelamento → fábrica; todas com link `/pedidos/<id>`

### TC-ORD-12 — Jornada (E2E)

- **Nível:** e2e
- **Passos:** revendedora monta pedido do seed (Vestido Midi Canelado, 12 peças) → envia → fábrica confirma
- **Resultado esperado:** pedido "Pendente" para a revenda, "Confirmado" após a resposta

### TC-ORD-13 — Produção, envio e recebimento (VES-32)

- **Nível:** integration
- **Resultado esperado:** `CONFIRMED → IN_PRODUCTION → SHIPPED` (rastreio aparado) → `DELIVERED`; datas preenchidas; uma `ENTRADA` por item vinculada ao pedido no estoque da revendedora; um segundo pedido soma na mesma variação; cada etapa notifica a outra parte; filtro por status funciona; pedido em produção ainda pode ser pago

### TC-ORD-14 — Quem avança e em que ordem (VES-32)

- **Nível:** unit + integration
- **Resultado esperado:** só a fábrica avança e só a revendedora recebe; não se recebe antes do envio nem duas vezes; não se volta para produção depois de enviado; pedido pendente não pula a confirmação
