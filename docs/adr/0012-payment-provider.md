# ADR-0012 — Provedor de pagamentos: Mercado Pago

- **Status:** Proposto (aguarda validação do professor e criação da conta sandbox)
- **Data:** 2026-10-09
- **Requisitos:** VES-70; prepara VES-24 (cartão à vista), VES-26 (parcelamento) e
  VES-27 (comissão da plataforma)

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

Adotar o **Mercado Pago** (Checkout API com Card Payment Brick e split via
`marketplace_fee`).

1. **Comissão sem custódia (VES-27).** Cada vendedor conecta a própria conta Mercado
   Pago por OAuth. O pagamento é criado com o token de acesso do vendedor, e o
   `marketplace_fee` fica com o Vestiq. O Vestiq nunca guarda o dinheiro do vendedor.
2. **Onboarding mais leve para quem recebe.** A maioria das revendedoras já tem conta
   Mercado Pago. Com Pagar.me, o Vestiq precisaria coletar dados bancários e conduzir o
   KYC de cada recebedor.
3. **Pix a custo zero** para a maioria das contas, o que importa num público que já vende
   por Pix. O Stripe só libera Pix por convite.
4. **Parcelamento nativo (VES-26)** em até 12x, com a escolha entre juros do comprador e
   juros do vendedor.
5. **Sandbox simples** com usuários de teste e cartões que forçam aprovado/recusado,
   suficiente para os testes de integração exigidos pela VES-24.

A **Pagar.me** fica como alternativa: o split por recebedores é o mais flexível, e vale
reavaliar se o Vestiq passar a precisar de regras de divisão complexas ou de
liquidação centralizada.

## Como vai funcionar

- **Cliente:** o Card Payment Brick tokeniza o cartão. Só o `token` chega à Server Action.
- **Servidor:** cria o pagamento com o `access_token` do vendedor (guardado
  criptografado e lido só no servidor) e o `marketplace_fee` calculado em centavos.
- **Webhook:** um Route Handler `/api/payments/webhook` valida a assinatura
  (`x-signature`) e chama uma função PostgreSQL que registra status, bruto, comissão e
  líquido de forma atômica (ADR-0004).
- **Variáveis de ambiente** (nenhuma chave real no repositório):
  - `MERCADOPAGO_ACCESS_TOKEN` (conta da plataforma, servidor)
  - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` (cliente)
  - `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` (OAuth dos vendedores)
  - `MERCADOPAGO_WEBHOOK_SECRET`
  - Em desenvolvimento e no CI, usar só as credenciais **de teste** do painel
    (prefixo `TEST-`).

## Pendências (antes de aceitar esta ADR)

- [ ] Validar a escolha com o professor.
- [ ] Criar a conta de desenvolvedor no Mercado Pago, a aplicação e os usuários de teste
      (comprador e vendedor). Essa etapa é manual e feita pelo time.
- [ ] Registrar as chaves de teste no `.env.local` de cada dev e nos segredos do CI.
- [ ] Definir quais transações serão pagas pela plataforma (pedido de abastecimento
      revendedora → fábrica e/ou transferência entre revendedoras). A pergunta está
      aberta nas VES-24/26/27.
- [ ] Confirmar no painel as taxas vigentes da conta.

## Consequências

- Vendedores sem conta Mercado Pago precisam criar uma para receber pelo Vestiq.
- A comissão depende do vendedor ter autorizado o OAuth. Sem a conexão, o checkout
  daquele vendedor fica indisponível.
- Ficamos acoplados à API do Mercado Pago. Para reduzir o custo de uma troca futura, a
  integração fica isolada em `src/features/payments/provider/`.
