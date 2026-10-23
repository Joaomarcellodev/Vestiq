# ACCEPTANCE — Pagamento de pedidos de abastecimento

## AC-PAY-001-01 — Pagar um pedido confirmado

**Dado** um pedido de 3 peças a R$ 79,90, confirmado pela fábrica
**Quando** toco em "Pagar R$ 239,70 com cartão"
**Então** sou levada ao Checkout do Stripe, com o valor de R$ 239,70 em reais
**E** o pedido mostra "Aguardando pagamento"

## AC-PAY-001-02 — Só pedido confirmado, só a revendedora

**Dado** um pedido pendente, recusado ou cancelado
**Então** não há botão de pagar
**E** o servidor recusa com "Só é possível pagar um pedido confirmado pelo fornecedor"
**E** a fábrica e outras revendas não conseguem abrir um checkout para o pedido

## AC-PAY-001-03 — Um checkout por vez

**Dado** que abri o checkout e voltei sem pagar
**Quando** toco em "Pagar" de novo dentro de 30 minutos
**Então** volto para o mesmo checkout, e nenhum outro é criado

## AC-PAY-002-01 — Status vindo do Stripe

**Dado** que paguei no Checkout
**Quando** o Stripe me devolve ao pedido, ou envia o webhook `checkout.session.completed`
**Então** o pedido mostra "Pago", com o valor e a data do pagamento
**E** o mesmo evento repetido não muda nada

## AC-PAY-002-02 — Ninguém marca pago por fora

**Dado** um pagamento pendente
**Quando** um usuário chama a função de status diretamente, ou o webhook recebe um evento sem assinatura válida
**Então** o pedido continua "Aguardando pagamento"

## AC-PAY-002-03 — Valor diferente

**Dado** um checkout registrado de R$ 239,70
**Quando** o webhook informa um pagamento de R$ 1,00
**Então** o pagamento não é aceito e continua pendente

## AC-PAY-002-04 — Tentar de novo

**Dado** um checkout que expirou ou cujo pagamento falhou
**Quando** toco em "Pagar"
**Então** um checkout novo é aberto

## AC-PAY-003-01 — Fábrica notificada

**Quando** o pedido é pago
**Então** a fábrica recebe "Pedido pago · <revenda> pagou o pedido de N peças", com link para o pedido
**E** recebe só uma notificação, mesmo que o Stripe reenvie o evento

## AC-PAY-004-01 — Fábrica reembolsa o pedido

**Dado** um pedido pago de R$ 239,70
**Quando** a fábrica (admin) informa o motivo, confirma e toca em "Reembolsar R$ 239,70"
**Então** o Stripe devolve o valor ao cartão e o pedido mostra "Reembolsado", com a data e o motivo
**E** a revendedora recebe "Pagamento reembolsado · R$ 239,70 do pedido para <fábrica> foram reembolsados no seu cartão"
**E** o pedido não pode ser pago nem reembolsado de novo

## AC-PAY-004-02 — Só a fábrica reembolsa

**Dado** um pedido pago
**Então** a revendedora e outras organizações não veem o reembolso e o servidor recusa com "Você não tem permissão para esta ação"
**E** sem marcar a confirmação, o reembolso não é feito

## AC-PAY-004-03 — Reembolso pelo painel do Stripe

**Dado** um pedido pago de R$ 319,60
**Quando** o Stripe informa R$ 100,00 reembolsados e, depois, o total
**Então** o pedido mostra primeiro "R$ 100,00 reembolsados", ainda como "Pago", e depois "Reembolsado"
**E** a revendedora recebe uma notificação a cada reembolso
