# ACCEPTANCE — Clientes

## AC-CUSTOMER-001-01 — Cadastrar cliente

**Dado** uma revendedora autenticada
**Quando** ela cadastra "Maria Rodrigues" com email
**Então** o cliente é criado vinculado à organização dela.

## AC-CUSTOMER-001-02 — CPF inválido

**Quando** a revendedora informa o CPF "111"
**Então** recebe "CPF inválido"
**E** o cliente não é criado.

## AC-CUSTOMER-001-03 — CPF duplicado

**Dado** um cliente com CPF X na organização
**Quando** a revendedora cadastra outro com o mesmo CPF
**Então** recebe "Cliente com este CPF já existe".

## AC-CUSTOMER-002-01 — Editar cliente

**Dado** um cliente existente
**Quando** a revendedora altera o telefone
**Então** o dado é atualizado.

## AC-CUSTOMER-003-01 — Isolamento

**Dado** as revendedoras A e B
**Quando** A busca clientes
**Então** vê apenas os seus
**E** acessar diretamente a URL de um cliente de B retorna 404.

## AC-CUSTOMER-004-01 — Histórico de compras

**Dado** um cliente com 3 vendas confirmadas e 1 cancelada
**Quando** a revendedora abre o detalhe
**Então** vê as 4 no histórico com o status de cada
**E** o total gasto soma apenas as confirmadas
**E** "última compra" é a data da venda confirmada mais recente.

## AC-CUSTOMER-004-02 — Cliente sem compras

**Dado** um cliente recém-criado
**Quando** a revendedora abre o detalhe
**Então** vê estado vazio no histórico e totais zerados.

## AC-CUSTOMER-notes — Notas internas

**Dado** um cliente
**Quando** a revendedora adiciona uma nota
**Então** a nota aparece no detalhe
**E** não é visível para nenhuma outra organização.

## AC-CUSTOMER-archive — Desativar

**Dado** um cliente com vendas
**Quando** a revendedora o desativa
**Então** ele some do seletor de nova venda
**E** o histórico e as vendas dele permanecem
**E** a exclusão física é bloqueada.
