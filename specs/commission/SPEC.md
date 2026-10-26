# SPEC-015 — Comissão da plataforma e recebimento da fábrica (Stripe Connect)

- **Status:** Implementada (falta ativar o Connect na conta Stripe para o teste real)
- **Sprint:** 5
- **Requisitos SDD:** RF-COM-001..004 (novos — "comissão por transação", SDD §6)
- **Jira:** VES-27
- **Telas:** `/recebimentos` (nova) e bloco "Pagamento" do pedido (`/pedidos/[id]`)
- **ADRs relacionados:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md), [0012](../../docs/adr/0012-payment-provider.md)
- **Depende de:** [SPEC-014 Pagamento de pedidos](../payments/SPEC.md)

## Contexto

Na SPEC-014, o pagamento do pedido caía inteiro na conta Stripe do Vestiq. A
VES-27 pede que a fábrica receba o valor e que o Vestiq retenha uma comissão,
com bruto, comissão e líquido registrados.

## Objetivo

- Cada fábrica tem uma conta de recebimento no **Stripe Connect** e a cadastra
  pelo próprio Vestiq.
- O pagamento do pedido vira uma **cobrança com destino**: o Stripe cobra na
  plataforma, transfere para a conta da fábrica e devolve a comissão ao Vestiq.
- A comissão é um **percentual por fábrica**, definido pela plataforma.

## Escopo

- Página **Recebimentos** para a fábrica: status da conta, botão de cadastro no
  Stripe e a comissão vigente.
- Conta conectada v2 de **recebedor** (`configuration.recipient`,
  `stripe_balance.stripe_transfers`), Dashboard Express, Brasil; a plataforma paga
  as tarifas do Stripe e cobre perdas (`fees_collector`/`losses_collector: application`).
- Checkout com `transfer_data.destination` e `application_fee_amount`.
- Bruto, percentual, comissão e líquido gravados em cada pagamento.
- Reembolso que devolve a transferência e a comissão.

## Fora do Escopo

- Tela para a plataforma editar a comissão (por ora, `set_factory_platform_fee`
  pelo SQL Editor do Supabase).
- Webhook de contas conectadas (eventos v2 de capacidade). O status é relido do
  Stripe na volta do cadastro e antes de cada pagamento.
- Acesso da fábrica ao Dashboard Express pelo Vestiq (login link).
- Contestações (chargebacks) e reversão manual de transferências.

## Atores

`FACTORY_ADMIN`/`PLATFORM_ADMIN` da fábrica cadastra a conta; os demais membros da
fábrica só leem. `RESELLER` paga. A **plataforma** (service role) define a comissão.

## Requisitos Relacionados

| RF         | Descrição                                                             |
| ---------- | --------------------------------------------------------------------- |
| RF-COM-001 | A fábrica cadastra a conta de recebimento no Stripe pelo Vestiq       |
| RF-COM-002 | O pagamento do pedido vai para a conta da fábrica, menos a comissão   |
| RF-COM-003 | Bruto, comissão e líquido ficam registrados e visíveis para a fábrica |
| RF-COM-004 | O reembolso devolve o valor da fábrica e a comissão                   |

## Regras de Negócio

| ID        | Regra                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| BR-COM-01 | Comissão por fábrica, de 0% a 50%, padrão 10%; só a plataforma altera (service role). A fábrica vê, não edita               |
| BR-COM-02 | Comissão = `round(total × percentual / 100, 2)`; o banco recusa outro valor. O percentual usado fica gravado no pagamento   |
| BR-COM-03 | Líquido = bruto − comissão (coluna gerada)                                                                                  |
| BR-COM-04 | Só se paga um pedido se a conta da fábrica estiver com `stripe_transfers` **active**, relido do Stripe na hora do pagamento |
| BR-COM-05 | Uma fábrica tem uma conta de recebimento; a criação é idempotente por organização e o vínculo não troca de conta            |
| BR-COM-06 | O reembolso de uma cobrança com destino usa `reverse_transfer` e `refund_application_fee`                                   |

## Fluxo Principal

1. A fábrica abre **Recebimentos** e toca em **Cadastrar conta de recebimento**.
2. `GET /api/payments/onboarding` cria a conta conectada (uma vez), grava o vínculo
   e redireciona para o cadastro hospedado pelo Stripe (Account Link).
3. Ao terminar, o Stripe volta para `/recebimentos?cadastro=retorno`; a página relê
   o status da conta. Com `active`, mostra "Pronta para receber".
4. A revendedora paga um pedido confirmado (SPEC-014). O servidor cota o pagamento
   (`quote_supply_order_payment`), relê a conta da fábrica no Stripe e cria o
   checkout com destino e comissão. O banco revalida tudo ao registrar.
5. Pago, a fábrica vê no pedido: valor pago, comissão do Vestiq e quanto recebe.

## Fluxos Alternativos

- **Link de cadastro expirado:** o Stripe manda para a `refresh_url`
  (`/api/payments/onboarding`), que gera um link novo para a mesma conta.
- **Fábrica sem conta ou com conta pendente/restrita:** a revendedora recebe "O
  fornecedor ainda não pode receber pagamentos pelo Vestiq"; a fábrica vê no
  pedido o aviso com o link para Recebimentos.
- **Conta perdeu a capacidade:** o próximo pagamento relê o Stripe, grava o novo
  status e recusa.

## Modelo de Dados

Migration `0037_platform_commission`:

- `factory_payment_accounts` — `organization_id` (PK), `stripe_account_id` (único),
  `transfers_status`, `platform_fee_percent` (padrão 10); `select` só para membros
  da fábrica, sem escrita direta;
- `supply_order_payments` + `platform_fee_percent`, `platform_fee_amount`,
  `net_amount` (gerada), `destination_account_id`;
- `quote_supply_order_payment(order)` — `authenticated` (membro da revenda);
- `register_supply_order_payment(order, session, amount, fee, destination)` —
  recriada com BR-COM-02/04;
- `link_factory_payment_account`, `set_factory_payment_account_status`,
  `set_factory_platform_fee` — **só `service_role`**.

## Segurança

- A fábrica não consegue alterar a própria comissão nem se marcar como pronta: as
  três funções de escrita são da service role, e a tabela não tem policy de escrita.
- A revendedora não lê a conta da fábrica; recebe só o necessário pela cotação.
- O status da conta vem sempre do Stripe (`v2.core.accounts.retrieve`).
- A rota de cadastro exige sessão e papel de admin da fábrica.

## Casos de Erro

| Situação                               | Resposta esperada                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Fábrica sem conta / conta não ativa    | "O fornecedor ainda não pode receber pagamentos pelo Vestiq"                          |
| Comissão diferente do percentual (RPC) | "A comissão não confere com o percentual do fornecedor"                               |
| Revendedora abre o cadastro            | volta para Recebimentos com "Só o administrador da fábrica…"                          |
| Stripe não configurado / fora do ar    | "Os pagamentos estão indisponíveis…" / "Não foi possível abrir o cadastro no Stripe…" |
| Fábrica já vinculada a outra conta     | "Esta fábrica já tem outra conta de recebimento"                                      |

## Tasks

- [x] Migration 0037 e tipos regenerados
- [x] Provedor: conta v2 de recebedor, Account Link, checkout com destino, reembolso com reversão
- [x] Rota `/api/payments/onboarding` e página Recebimentos
- [x] Comissão e líquido no pedido
- [x] Testes de integração (TC-COM-01..06)
- [ ] **Ativar o Connect** na conta Stripe (configuração de plataforma) e testar o cadastro e um pagamento reais
