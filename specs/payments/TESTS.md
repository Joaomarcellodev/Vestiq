# TESTS — Pagamento de pedidos de abastecimento

## Matriz de rastreabilidade

| RF         | AC            | TC                              | Nível              | Arquivo                                              |
| ---------- | ------------- | ------------------------------- | ------------------ | ---------------------------------------------------- |
| RF-PAY-001 | AC-PAY-001-01 | TC-PAY-01                       | integration        | `src/features/payments/payments.integration.test.ts` |
| RF-PAY-001 | AC-PAY-001-03 | TC-PAY-02                       | integration        | idem                                                 |
| RF-PAY-001 | AC-PAY-001-02 | TC-PAY-03, TC-PAY-04, TC-PAY-05 | integration        | idem                                                 |
| RF-PAY-002 | AC-PAY-002-01 | TC-PAY-06, TC-PAY-11, TC-PAY-12 | integration        | idem                                                 |
| RF-PAY-002 | AC-PAY-002-02 | TC-PAY-05, TC-PAY-07            | integration        | idem                                                 |
| RF-PAY-002 | AC-PAY-002-03 | TC-PAY-08                       | integration        | idem                                                 |
| RF-PAY-002 | AC-PAY-002-04 | TC-PAY-10                       | integration        | idem                                                 |
| RF-PAY-002 | AC-PAY-002-01 | TC-PAY-09, TC-PAY-13            | unit + integration | `src/features/payments/status.test.ts`, idem         |
| RF-PAY-003 | AC-PAY-003-01 | TC-PAY-06                       | integration        | idem                                                 |

O Stripe é simulado nos testes de integração (`createCheckout`, `getCheckout` e
`expireCheckout`). A verificação de assinatura do webhook é a real do SDK, com
eventos assinados por `Stripe.webhooks.generateTestHeaderString`.

## Casos de teste

### TC-PAY-01 — Abre o checkout com o total congelado

- **Nível:** integration
- **Passos:** pedido confirmado de 3 × R$ 79,90 → `payOrderWithCard`
- **Resultado esperado:** redireciona para `checkout.stripe.com`; checkout criado com R$ 239,70, URLs de volta e de cancelamento do pedido; pagamento `PENDING` em BRL, criado pela revendedora e visível para a fábrica
- **Regra crítica (SDD §38):** sim

### TC-PAY-02 — Reaproveita o checkout aberto

- **Nível:** integration
- **Resultado esperado:** o segundo clique redireciona para a mesma sessão; um só checkout criado e um só pagamento gravado

### TC-PAY-03 — Só a revendedora, só pedido confirmado

- **Nível:** integration
- **Resultado esperado:** pedido pendente → "Só é possível pagar…"; fábrica → "Somente a revendedora…"; outra revenda e id inválido → "Pedido não encontrado"; nenhum checkout criado
- **Regra crítica (SDD §38):** sim

### TC-PAY-04 — Stripe não configurado

- **Nível:** integration
- **Resultado esperado:** "Os pagamentos estão indisponíveis no momento."

### TC-PAY-05 — Guardas no banco

- **Nível:** integration
- **Resultado esperado:** `register_supply_order_payment` recusa outra revenda, valor diferente e um segundo `PENDING`; `apply_supply_order_payment_status` chamada por usuário → `42501`
- **Regra crítica (SDD §38):** sim

### TC-PAY-06 — Webhook marca pago e notifica

- **Nível:** integration
- **Passos:** `checkout.session.completed` assinado, pago, com o valor do pedido; depois o mesmo evento outra vez
- **Resultado esperado:** `PAID`, `paid_at` e `payment_intent_id` gravados; uma notificação `SUPPLY_ORDER_PAID` para a fábrica; o reenvio não muda nada; pagar de novo → "Este pedido já foi pago"
- **Regra crítica (SDD §38):** sim

### TC-PAY-07 — Assinatura inválida

- **Nível:** integration
- **Resultado esperado:** sem cabeçalho, corpo alterado ou segredo errado → 400; pagamento continua `PENDING`
- **Regra crítica (SDD §38):** sim

### TC-PAY-08 — Valor pago diferente

- **Nível:** integration
- **Resultado esperado:** 500 (o Stripe reenvia); pagamento continua `PENDING`

### TC-PAY-09 — Eventos ignorados

- **Nível:** integration
- **Resultado esperado:** sessão não registrada → 200 `ignored`; tipo de evento fora do checkout → 200

### TC-PAY-10 — Nova tentativa depois de expirar

- **Nível:** integration
- **Resultado esperado:** `checkout.session.expired` → `EXPIRED`; o próximo "Pagar" abre outra sessão; histórico `EXPIRED`, `PENDING`

### TC-PAY-11 — Conferência na volta do checkout

- **Nível:** integration
- **Resultado esperado:** sessão aberta → nada muda; sessão de outro pedido → nada muda; sessão paga → `PAID`

### TC-PAY-12 — Checkout pago enquanto a tela estava aberta

- **Nível:** integration
- **Resultado esperado:** "Pagar" encontra a sessão paga, registra `PAID` e volta ao pedido com "Pagamento aprovado", sem criar outro checkout

### TC-PAY-13 — Mapeamento de status e centavos

- **Nível:** unit
- **Resultado esperado:** só `complete + paid` é `PAID`; `completed` não pago aguarda o evento assíncrono; `async_payment_failed` → `FAILED`; `expired` → `EXPIRED`; R$ 1.678,20 → 167820 centavos
