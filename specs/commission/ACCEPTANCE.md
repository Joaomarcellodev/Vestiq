# ACCEPTANCE — Comissão da plataforma e recebimento da fábrica

## AC-COM-001-01 — Cadastrar a conta de recebimento

**Dado** que sou admin de uma fábrica sem conta de recebimento
**Quando** toco em "Cadastrar conta de recebimento"
**Então** sou levada ao cadastro do Stripe
**E** ao voltar, a página mostra o status da conta ("Cadastro pendente" ou "Pronta para receber")

## AC-COM-001-02 — Só o admin cadastra

**Dado** que sou revendedora ou membro sem papel de admin da fábrica
**Então** não consigo abrir o cadastro

## AC-COM-002-01 — Pagamento com comissão

**Dado** uma fábrica pronta para receber, com comissão de 12,5%
**Quando** a revendedora paga um pedido de R$ 239,70
**Então** o Stripe cobra R$ 239,70, transfere para a conta da fábrica e retém R$ 29,96 para o Vestiq

## AC-COM-002-02 — Fábrica que não pode receber

**Dado** uma fábrica sem conta, ou com a conta pendente ou restrita no Stripe
**Quando** a revendedora tenta pagar
**Então** recebe "O fornecedor ainda não pode receber pagamentos pelo Vestiq" e nenhum checkout é aberto

## AC-COM-003-01 — Bruto, comissão e líquido

**Dado** um pedido pago
**Então** a fábrica vê no pedido o valor pago, a comissão do Vestiq com o percentual e quanto recebe

## AC-COM-004-01 — Reembolso

**Quando** a fábrica reembolsa um pedido pago
**Então** o valor sai da conta da fábrica e a comissão também é devolvida
