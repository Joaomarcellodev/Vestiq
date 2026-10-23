# ADR-0012 — Provedor de pagamentos: Stripe

- **Status:** Aceito pelo time (falta a validação com o professor)
- **Data:** 2026-10-09 (proposta: Mercado Pago) · revisada em 2026-10-23 (decisão: Stripe)
- **Requisitos:** VES-70; VES-24 (cartão à vista, [SPEC-014](../../specs/payments/SPEC.md));
  prepara VES-26 (parcelamento) e VES-27 (comissão da plataforma)

## Contexto

O Vestiq ainda não tem integração de pagamento. As três histórias de pagamentos da
Sprint 5 pedem:

- checkout com cartão **sem que dados do cartão passem pelo nosso servidor**
  (tokenização no navegador);
- parcelamento com juros configuráveis e valor das parcelas visível antes de confirmar;
- **retenção de uma comissão** da plataforma em cada transação, com bruto, comissão e
  líquido registrados. Isso exige _split_: o dinheiro vai para quem vende (fábrica ou
  revendedora) e a comissão fica com o Vestiq, sem o Vestiq custodiar o valor do vendedor.

Quem recebe são fábricas e revendedoras pequenas, muitas vezes pessoa física ou MEI.
O onboarding de recebedor precisa ser simples. A stack é Next.js 16 (Server Actions e
Route Handlers) e Supabase. O webhook do provedor atualiza o status pela mesma via das
outras operações críticas: uma função PostgreSQL transacional (ADR-0004).

## Opções comparadas

Taxas pesquisadas em 09/10/2026, sem negociação comercial. Elas mudam com o volume, o
prazo de recebimento e o perfil da conta, e foram tiradas de páginas oficiais e de
comparativos públicos que nem sempre concordam entre si. **Os valores definitivos
precisam ser confirmados no painel de cada conta.**

| Critério                              | Mercado Pago                                                                                  | Pagar.me (Stone)                                                     | Stripe                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cartão de crédito à vista             | ~4,98% (recebe na hora) · ~3,98% (30 dias)                                                    | ~4,19% (tabela pública antiga; hoje só no painel)                    | ~3,99% + R$ 0,39                                                           |
| Pix                                   | 0% para a maioria das contas (0,49% para CNPJ novo acima de R$ 15 mil/mês)                    | ~0,99%                                                               | ~1,19%, **só por convite** (exige histórico na conta)                      |
| Prazo de recebimento                  | Escolhido pelo vendedor (na hora, 14 ou 30 dias): quanto mais longo, menor a taxa             | Configurável por recebedor (antecipação opcional)                    | D+2 a D+30, conforme o país e o risco                                      |
| Parcelamento (VES-26)                 | Até 12x; juros repassados ao comprador ou absorvidos pelo vendedor                            | Até 12x, com tabela de juros por recebedor                           | Parcelamento BR suportado, com menos opções de configuração                |
| Split / comissão (VES-27)             | **Checkout API com `marketplace_fee`**: o vendedor conecta a própria conta MP por OAuth      | **Split nativo por recebedores** (regras em % ou valor por pedido)  | **Connect**: US$ 2 por conta ativa/mês + 0,25% + 25¢ por repasse (preço global) |
| Onboarding do recebedor               | Login com uma conta MP que a revendedora provavelmente já tem                                 | Cadastro de recebedor com dados bancários e KYC feito pela plataforma | Onboarding Connect (KYC da Stripe), pensado para empresas                  |
| Tokenização no navegador              | Card Payment Brick / `MercadoPago.js`                                                         | `tokenizecard.js` / checkout próprio                                 | Stripe Elements                                                            |
| Sandbox                               | Usuários de teste (comprador e vendedor) e cartões de teste com resultado forçado             | Chaves `sk_test` e cartões de teste                                  | Modo teste completo e muito maduro                                         |
| SDK Node e documentação               | SDK oficial `mercadopago` em TypeScript; documentação em PT-BR                                | SDK REST simples; documentação em PT-BR                              | Melhor SDK e documentação do mercado (em inglês)                           |
| Esforço com Next.js + Supabase        | Baixo: Brick no cliente, criação do pagamento em Server Action, webhook em Route Handler     | Médio: o cadastro de recebedores é responsabilidade nossa            | Médio/alto: Connect e conformidade, com preço de split em dólar            |

## Decisão

Adotar o **Stripe**, com o **Checkout hospedado** (Checkout Sessions API) para o
pagamento com cartão à vista (VES-24).

A proposta de 09/10 era o Mercado Pago. Em 23/10 o time criou a conta no
Stripe (área restrita/sandbox, país Brasil) e decidiu seguir com ele:

1. **Cartão fora do nosso servidor.** O Checkout hospedado coleta o cartão na
   página do Stripe. O Vestiq não toca em dados de cartão, e o escopo PCI fica no
   mínimo (SAQ A).
2. **Sandbox e documentação.** Modo de teste completo, cartões de teste com
   resultado forçado, Stripe CLI para encaminhar webhooks em desenvolvimento e o
   melhor SDK Node da comparação.
3. **Esforço baixo para a VES-24.** Uma Server Action cria a sessão, e um Route
   Handler recebe o webhook. Não há componente de cartão no cliente.
4. **Caminho para as próximas histórias.** Parcelamento no Brasil (VES-26) e
   split via Connect (VES-27) existem na mesma API. O custo do Connect em dólar
   continua sendo o principal ponto contra e será reavaliado na VES-27.

O que perdemos em relação ao Mercado Pago, registrado na tabela acima: **Pix só
por convite** e um onboarding de recebedores (Connect) mais pesado do que o OAuth
com uma conta Mercado Pago que a revendedora já tem. A **Pagar.me** continua como
alternativa se o split por recebedores virar requisito forte.

## Como funciona (SPEC-014)

- **Integração isolada** em `src/features/payments/provider/stripe.ts`: é o único
  módulo que importa o SDK `stripe`. O resto do app usa tipos próprios.
- **Servidor:** a action `payOrderWithCard` cria uma Checkout Session
  (`mode: payment`, só cartão, BRL, valor do pedido em centavos, expira em 30 min)
  e grava o pagamento `PENDING` por `register_supply_order_payment`.
- **Webhook:** `POST /api/payments/webhook` (rota pública) verifica a assinatura
  `Stripe-Signature` sobre o corpo bruto e chama
  `apply_supply_order_payment_status` com a service role. A função é idempotente,
  transacional (ADR-0004) e não pode ser chamada por usuários. Eventos:
  `checkout.session.completed` (só com `payment_status = paid`),
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
  e `checkout.session.expired`.
- **Volta do checkout:** `/pedidos/[id]?checkout=<sessão>` lê a sessão na API do
  Stripe e registra o resultado, para o pedido aparecer pago sem esperar o
  webhook. É um complemento: **o webhook é obrigatório**, porque a revendedora
  pode pagar e não voltar.
- **Variáveis de ambiente** (nenhuma chave no repositório):
  - `STRIPE_SECRET_KEY` (servidor). Preferir uma chave restrita `rk_` com escrita
    em Checkout Sessions.
  - `STRIPE_WEBHOOK_SECRET` (servidor), do endpoint no painel ou da `stripe listen`.
  - Em desenvolvimento e no CI, só chaves da **área restrita** (sandbox).

## Pendências

- [x] Criar a conta no Stripe (área restrita, Brasil).
- [x] Definir o que é pago: o **pedido de abastecimento** confirmado
      (revendedora → fábrica). Negociações entre revendedoras ficam de fora por ora.
- [ ] Cadastrar as chaves de teste no `.env.local` de cada dev e no Netlify.
- [ ] Cadastrar o endpoint de webhook no painel (ver `docs/DEPLOY.md`).
- [ ] Validar a escolha com o professor.
- [ ] Confirmar no painel as taxas vigentes da conta.

## Consequências

- Nesta etapa o valor do pedido cai na conta Stripe da **plataforma**. Repassar
  para a fábrica exige o Connect (VES-27), com onboarding e KYC de cada recebedor.
- Sem Pix até o Stripe liberar o meio para a conta. Como os pedidos são pagos por
  cartão, o fluxo de status já trata meios assíncronos (`async_payment_*`) para
  quando o Pix entrar.
- Ficamos acoplados à API do Stripe. Para reduzir o custo de uma troca, a
  integração fica isolada em `src/features/payments/provider/`, e o banco guarda
  só `checkout_session_id` e `payment_intent_id`.
