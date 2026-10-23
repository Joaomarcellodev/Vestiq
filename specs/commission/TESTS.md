# TESTS — Comissão da plataforma e recebimento da fábrica

## Matriz de rastreabilidade

| RF         | AC            | TC                   | Nível       | Arquivo                                              |
| ---------- | ------------- | -------------------- | ----------- | ---------------------------------------------------- |
| RF-COM-001 | AC-COM-001-01 | TC-COM-05            | integration | `src/features/payments/payments.integration.test.ts` |
| RF-COM-001 | AC-COM-001-02 | TC-COM-06            | integration | idem                                                 |
| RF-COM-002 | AC-COM-002-01 | TC-COM-01            | integration | idem                                                 |
| RF-COM-002 | AC-COM-002-02 | TC-COM-03            | integration | idem                                                 |
| RF-COM-003 | AC-COM-003-01 | TC-COM-01, TC-PAY-01 | integration | idem                                                 |
| RF-COM-004 | AC-COM-004-01 | TC-COM-02            | integration | idem                                                 |
| BR-COM-01  | —             | TC-COM-04            | integration | idem                                                 |

O Stripe é simulado (`createRecipientAccount`, `getRecipientStatus`,
`createOnboardingLink`, `createCheckout`, `refundPayment`).

## Casos de teste

### TC-COM-01 — Destino e comissão por fábrica

- **Resultado esperado:** com 12,5%, o checkout leva `destination` da fábrica e comissão R$ 29,96 sobre R$ 239,70; o pagamento grava percentual, comissão, líquido R$ 209,74 e destino
- **Regra crítica (SDD §38):** sim

### TC-COM-02 — Reembolso de cobrança com destino

- **Resultado esperado:** o reembolso é pedido com `destinationCharge` (reversão da transferência e da comissão)

### TC-COM-03 — Fábrica que não pode receber

- **Resultado esperado:** conta relida como `restricted` → pagamento recusado e status gravado; fábrica sem conta → recusado; nenhum checkout criado
- **Regra crítica (SDD §38):** sim

### TC-COM-04 — Conta e comissão fora do alcance dos usuários

- **Resultado esperado:** revendedora não lê a conta; a fábrica lê a sua; as três funções de escrita → `42501` para usuários; update direto não muda a comissão; a fábrica não troca de conta
- **Regra crítica (SDD §38):** sim

### TC-COM-05 — Cadastro pelo Stripe

- **Resultado esperado:** a primeira ida cria a conta e o vínculo (`pending`, 10%) e redireciona para o link com `refresh_url`/`return_url` certos; a segunda reaproveita a conta com um link novo; na volta, o status `active` é gravado

### TC-COM-06 — Quem não pode cadastrar

- **Resultado esperado:** revendedora → `payouts-not-allowed`; Stripe não configurado → `payouts-unavailable`; nenhuma conta criada
