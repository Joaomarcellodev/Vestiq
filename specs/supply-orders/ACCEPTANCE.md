# ACCEPTANCE — Pedidos de abastecimento

## AC-ORD-001-01 — Fazer um pedido com vários produtos

**Dado** que a "Fábrica Modah" é fornecedora da minha revenda
**Quando** informo 6 × Preto/P e 6 × Preto/M do "Vestido Midi" (mínimo 12) e 6 × Bege/38 da "Calça Wide" (mínimo 6) e envio
**Então** o pedido é criado como "Pendente", com 18 peças e o total calculado
**E** sou levada ao detalhe do pedido

## AC-ORD-001-02 — Fornecedor fora das minhas redes

**Dado** uma fábrica que não é minha fornecedora
**Quando** tento enviar um pedido para ela
**Então** recebo "Fornecedor indisponível" e nada é gravado

## AC-ORD-001-03 — Preço congelado

**Dado** um pedido enviado a R$ 79,90 por peça
**Quando** a fábrica muda o preço para R$ 99,90
**Então** o pedido continua mostrando R$ 79,90

## AC-ORD-002-01 — Pedido mínimo por produto

**Dado** um produto com pedido mínimo de 12 peças
**Quando** peço 10 peças dele
**Então** a tela mostra "Faltam 2 peças para o mínimo" e não deixa enviar
**E** o banco também recusa, com "Pedido mínimo de 12 peças para <produto>"

## AC-ORD-003-01 — Listas de pedidos

**Quando** a revendedora abre Pedidos
**Então** vê os pedidos que enviou, com fornecedor, peças, total e status
**E** a fábrica vê os pedidos que recebeu, com a revenda de origem
**E** nenhuma outra organização vê esses pedidos

## AC-ORD-004-01 — Fábrica confirma

**Dado** um pedido pendente
**Quando** a fábrica confirma
**Então** o status vira "Confirmado" e a revendedora é notificada

## AC-ORD-004-02 — Fábrica recusa com justificativa

**Quando** a fábrica recusa com "Sem tecido até março"
**Então** o status vira "Recusado", a justificativa aparece no pedido e a revendedora é notificada

## AC-ORD-004-03 — Só a fábrica responde

**Quando** a revendedora tenta confirmar o próprio pedido
**Então** a operação é negada

## AC-ORD-005-01 — Cancelar pedido pendente

**Quando** a revendedora cancela um pedido pendente
**Então** o status vira "Cancelado" e a fábrica é notificada

## AC-ORD-005-02 — Estados finais não mudam

**Dado** um pedido confirmado, recusado ou cancelado
**Quando** qualquer parte tenta responder ou cancelar
**Então** recebe "Este pedido não está mais pendente"

## AC-ORD-006-01 — Notificação de novo pedido

**Quando** a revendedora envia um pedido
**Então** a fábrica recebe "Novo pedido de abastecimento" com link para o pedido
