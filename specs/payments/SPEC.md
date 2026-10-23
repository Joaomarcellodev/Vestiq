# SPEC-014 — Pagamento de pedidos de abastecimento (cartão à vista)

- **Status:** Implementada
- **Sprint:** 5
- **Requisitos SDD:** RF-PAY-001..004 (novos — evolução "pagamento dentro da plataforma", SDD §6)
- **Jira:** VES-24 (cartão à vista); prepara VES-26 (parcelamento) e VES-27 (comissão)
- **Telas:** sem protótipo — bloco "Pagamento" no detalhe do pedido (`/pedidos/[id]`)
- **ADRs relacionados:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md), [0008](../../docs/adr/0008-currency-brl.md), [0012](../../docs/adr/0012-payment-provider.md)
- **Depende de:** [SPEC-012 Pedidos de abastecimento](../supply-orders/SPEC.md)

## Contexto

Com a SPEC-012, a fábrica confirma o pedido da revendedora, mas o pagamento
ainda acontece por fora do Vestiq (Pix, boleto, transferência). A ADR-0012
escolheu o **Stripe**, com o Checkout hospedado: o cartão é digitado na página
do Stripe e nunca passa pelo servidor do Vestiq.

## Problema

A revendedora precisa pagar o pedido confirmado sem sair do fluxo do Vestiq, e
a fábrica precisa saber, com segurança, que o pedido foi pago.

## Objetivo

- A revendedora paga, com cartão de crédito e à vista, o total de um pedido confirmado.
- As duas partes veem o status do pagamento no pedido, e a fábrica é notificada.
- O status vem do próprio Stripe: nenhum usuário consegue marcar um pedido como pago.

## Escopo

- Botão **Pagar com cartão** no pedido confirmado, que leva ao Checkout do Stripe.
- Registro da sessão de checkout e do status (`PENDING → PAID | FAILED | EXPIRED`).
- Webhook assinado do Stripe como fonte do status; conferência na volta do checkout.
- Reaproveitamento do checkout ainda aberto; nova tentativa depois de expirar ou falhar.
- Notificação da fábrica quando o pedido é pago.
- Reembolso integral pela fábrica, no pedido; reembolsos feitos no painel do Stripe
  (inclusive parciais) refletidos no Vestiq pelo webhook, com notificação da revendedora.

## Fora do Escopo

- Parcelamento (VES-26) e comissão/repasse para a fábrica via Connect (VES-27).
  Nesta etapa o valor cai na conta Stripe da plataforma.
- Pix, boleto e outros meios. No Stripe Brasil, o Pix é liberado só por convite.
- Reembolso parcial pelo Vestiq (só pelo painel do Stripe) e pedido de reembolso
  pela revendedora.
- Disputa (chargeback) e cancelamento automático do pedido reembolsado.
- Pagamento de negociações entre revendedoras (SPEC-009).

## Atores

`RESELLER` (membro da revenda do pedido) paga. `FACTORY_ADMIN`/`PLATFORM_ADMIN` do
fornecedor reembolsa; os demais membros do fornecedor acompanham. O **Stripe**
informa o resultado pelo webhook.

## Requisitos Relacionados

| RF         | Descrição                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| RF-PAY-001 | A revendedora paga com cartão, à vista, um pedido confirmado pelo fornecedor |
| RF-PAY-002 | O status do pagamento é atualizado a partir do Stripe (webhook e retorno)    |
| RF-PAY-003 | O fornecedor é notificado e as duas partes veem o pagamento no pedido        |
| RF-PAY-004 | O fornecedor reembolsa um pedido pago, e a revendedora é notificada          |

## User Stories

| ID        | Como…         | Quero…                                     | Para…                                             |
| --------- | ------------- | ------------------------------------------ | ------------------------------------------------- |
| US-PAY-01 | RESELLER      | pagar com cartão um pedido confirmado      | concluir a compra sem sair do Vestiq              |
| US-PAY-02 | FACTORY_ADMIN | saber quando um pedido foi pago            | liberar a produção e o envio                      |
| US-PAY-03 | RESELLER      | tentar de novo se o pagamento não concluir | não perder o pedido por um cartão negado          |
| US-PAY-04 | FACTORY_ADMIN | reembolsar um pedido pago                  | devolver o valor de um pedido que não vou atender |

## Regras de Negócio

| ID        | Regra                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-PAY-01 | Só se paga um pedido `CONFIRMED`, e só um membro da revenda do pedido pode pagar                                                                                               |
| BR-PAY-02 | Um pedido é pago uma vez: com um pagamento `PAID`, não se abre outro checkout                                                                                                  |
| BR-PAY-03 | No máximo um checkout `PENDING` por pedido; clicar de novo reabre o mesmo checkout enquanto ele estiver aberto (expira em 30 minutos)                                          |
| BR-PAY-04 | O checkout cobra exatamente `total_amount` do pedido, em BRL; o webhook recusa um valor pago diferente do registrado                                                           |
| BR-PAY-05 | Só o Stripe define o status: eventos com assinatura válida, ou a sessão lida da API do Stripe pelo servidor. `PAID`, `FAILED` e `EXPIRED` são finais                           |
| BR-PAY-06 | Os dados do cartão nunca passam pelo Vestiq (Checkout hospedado pelo Stripe)                                                                                                   |
| BR-PAY-07 | Um pedido reembolsado não é pago de novo; para comprar de novo, a revendedora faz um novo pedido                                                                               |
| BR-PAY-08 | Só `FACTORY_ADMIN`/`PLATFORM_ADMIN` do fornecedor reembolsa, só pagamento `PAID`, sempre o restante integral, com confirmação explícita e motivo opcional (até 500 caracteres) |
| BR-PAY-09 | O valor reembolsado vem do Stripe (`charge.amount_refunded`), nunca diminui e não passa do valor pago; só o reembolso total muda o status para `REFUNDED`                      |

## Fluxo Principal

1. A fábrica confirma o pedido (SPEC-012). O pedido mostra o bloco **Pagamento**,
   com o status "Aguardando pagamento".
2. A revendedora toca em **Pagar R$ X com cartão**. O servidor cria a sessão de
   checkout no Stripe, registra o pagamento `PENDING` e a redireciona para a
   página do Stripe.
3. Ela paga. O Stripe a devolve para `/pedidos/[id]?checkout=<sessão>`. O
   servidor lê a sessão no Stripe e registra `PAID`.
4. O Stripe envia `checkout.session.completed` ao webhook, que confirma o mesmo
   status (sem efeito se já estiver `PAID`).
5. A fábrica recebe a notificação "Pedido pago", e o pedido mostra "Pago",
   com o valor e a data, para as duas partes.

## Fluxos Alternativos

- **Desistiu no checkout:** o Stripe volta com `?toast=supply-order-payment-cancelled`.
  O checkout continua aberto até expirar, e **Pagar** reabre o mesmo.
- **Checkout expirou:** o webhook (`checkout.session.expired`) registra `EXPIRED`,
  e **Pagar** abre um checkout novo.
- **Cartão recusado:** o próprio Checkout do Stripe mostra o erro e pede outro
  cartão. A sessão continua aberta, e nada muda no Vestiq.
- **Falha posterior:** `checkout.session.async_payment_failed` (meios de pagamento
  com confirmação assíncrona) registra `FAILED`, e a revendedora pode tentar de novo.
- **Pago, mas a volta não carregou:** o webhook registra `PAID`. Se a revendedora
  tocar em **Pagar** antes disso, o servidor encontra a sessão paga e registra o pagamento.
- **Stripe não configurado:** "Os pagamentos estão indisponíveis no momento."
- **Reembolso pela fábrica:** no pedido pago, a fábrica informa um motivo
  (opcional), confirma e toca em **Reembolsar R$ X**. O servidor confere a
  permissão no banco, pede o reembolso ao Stripe (chave de idempotência por
  pagamento) e registra o total reembolsado lido do Stripe → `REFUNDED`. O
  webhook `charge.refunded` confirma. A revendedora é notificada.
- **Reembolso pelo painel do Stripe:** o webhook `charge.refunded` registra o
  total reembolsado. Parcial: continua `PAID`, com o valor reembolsado no pedido.
  Total: `REFUNDED`. Cada aumento gera uma notificação para a revendedora.
- **Stripe recusa o reembolso:** "Não foi possível reembolsar o pagamento. Tente
  novamente."; o pedido continua pago.

## Estados

```
PENDING ──pago (Stripe)──────▶ PAID
   │ └────falhou (Stripe)────▶ FAILED   ──▶ novo checkout
   └──────expirou (30 min)───▶ EXPIRED  ──▶ novo checkout

PAID ──reembolso total (Vestiq ou painel)──▶ REFUNDED   (parcial: continua PAID)
```

## Critérios de Aceitação

Ver [`ACCEPTANCE.md`](./ACCEPTANCE.md).

## Modelo de Dados

Migrations `0033_supply_order_paid_notification_type` (valor `SUPPLY_ORDER_PAID`
do enum `notification_type`) e `0034_supply_order_payments`:

- enum `payment_status` (`PENDING`, `PAID`, `FAILED`, `EXPIRED`);
- `supply_order_payments` — `order_id`, `provider` (`stripe`), `checkout_session_id`
  (único), `payment_intent_id`, `status`, `amount`, `currency` (`BRL`), `created_by`,
  `paid_at`; índice único parcial `(order_id) where status = 'PENDING'` (BR-PAY-03);
- RPC `register_supply_order_payment(order, session, amount)` — `authenticated`;
- RPC `apply_supply_order_payment_status(session, status, amount?, payment_intent?)` —
  **só `service_role`**, idempotente;
- trigger `notify_supply_order_paid` (RF-PAY-003).

Migrations `0035_payment_refund_types` (`REFUNDED` em `payment_status` e
`SUPPLY_ORDER_REFUNDED` em `notification_type`) e `0036_supply_order_payment_refunds`:

- colunas `refunded_amount` (0 a `amount`), `refunded_at`, `refunded_by`, `refund_reason`;
  índice por `payment_intent_id`;
- `register_supply_order_payment` recriada com a guarda de pedido reembolsado (BR-PAY-07);
- RPC `authorize_supply_order_refund(order, reason?)` — `authenticated`, só leitura (BR-PAY-08);
- RPC `apply_supply_order_payment_refund(payment_intent, amount_refunded, refunded_by?, reason?)` —
  **só `service_role`**, idempotente e monotônica (BR-PAY-09);
- trigger `notify_supply_order_refunded` (RF-PAY-004).

## Segurança

- RLS de `select`: as duas partes do pedido (mesma regra de `supply_order_items`).
  Sem policies de escrita.
- `register_supply_order_payment` exige ser membro da revenda e revalida status,
  pagamento existente e valor (BR-PAY-01..04).
- `apply_supply_order_payment_status` não pode ser chamada por usuários: o
  servidor a chama com a service role (`SUPABASE_SECRET_KEY`), só depois de ler o
  status do Stripe (webhook com assinatura verificada ou `checkout.sessions.retrieve`).
- O webhook `/api/payments/webhook` é rota pública (o Stripe não tem sessão). A
  assinatura `Stripe-Signature` é verificada sobre o corpo bruto com
  `STRIPE_WEBHOOK_SECRET`: corpo alterado ou segredo errado → 400.
- O reembolso segue o mesmo desenho: `authorize_supply_order_refund` confere o
  papel no fornecedor antes de qualquer chamada ao Stripe, e só a service role
  grava o valor reembolsado, sempre lido do Stripe.
- A chave do Stripe é só de servidor. Recomenda-se uma chave restrita (`rk_`) com
  escrita em Checkout Sessions e em Refunds e leitura em PaymentIntents. Nenhuma
  chave vai para o repositório.

## Casos de Erro

| Situação                                     | Resposta esperada                                           |
| -------------------------------------------- | ----------------------------------------------------------- |
| Pedido pendente, recusado ou cancelado       | "Só é possível pagar um pedido confirmado pelo fornecedor"  |
| Fábrica tenta pagar                          | "Somente a revendedora do pedido pode pagar"                |
| Pedido de outra organização / id inválido    | "Pedido não encontrado"                                     |
| Pedido já pago                               | "Este pedido já foi pago"                                   |
| Dois checkouts ao mesmo tempo                | "Já existe um pagamento em andamento para este pedido"      |
| Valor diferente do total (RPC)               | "O valor do pagamento não confere com o total do pedido"    |
| Stripe fora do ar ao criar o checkout        | "Não foi possível abrir o pagamento. Tente novamente."      |
| Stripe não configurado                       | "Os pagamentos estão indisponíveis no momento."             |
| Webhook sem assinatura válida                | HTTP 400, nada muda                                         |
| Webhook com valor pago diferente             | HTTP 500 (o Stripe reenvia), pagamento continua `PENDING`   |
| Webhook de sessão que o Vestiq não registrou | HTTP 200 `ignored`                                          |
| Pagar um pedido reembolsado                  | "Este pedido foi reembolsado"                               |
| Revendedora ou outra organização reembolsa   | "Você não tem permissão para esta ação"                     |
| Reembolsar pedido sem pagamento `PAID`       | "Este pedido não tem um pagamento para reembolsar"          |
| Reembolso sem a confirmação                  | "Confirme o reembolso"                                      |
| Stripe recusa o reembolso                    | "Não foi possível reembolsar o pagamento. Tente novamente." |
| Webhook com reembolso maior que o pago       | HTTP 500, nada muda                                         |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [x] ADR-0012 revisada para Stripe (VES-70)
- [x] Migrations 0033/0034 e tipos regenerados
- [x] `src/features/payments` — provedor Stripe isolado, action, sincronização e query
- [x] Webhook `/api/payments/webhook` e rota pública no `proxy`
- [x] Bloco "Pagamento" no pedido, toasts e ícone de notificação
- [x] Testes unitários e de integração
- [x] Reembolso pela fábrica e pelo painel do Stripe (migrations 0035/0036)
- [ ] Endpoint de webhook (com `charge.refunded`) cadastrado no painel do Stripe e chaves no Netlify
- [ ] E2E com o Checkout real do Stripe (depende das chaves no CI)
