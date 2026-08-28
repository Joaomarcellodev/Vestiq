# ACCEPTANCE — Catálogo

## AC-PROD-001-01 — Criar categoria

**Dado** uma revendedora autenticada
**Quando** ela cria a categoria "Bolsas"
**Então** a categoria existe vinculada à organização dela.

## AC-PROD-001-02 — Categoria duplicada

**Dado** a categoria "Bolsas" já existente na organização
**Quando** a revendedora tenta criar "Bolsas" de novo
**Então** recebe erro de nome duplicado.

## AC-PROD-002-01 — Cadastrar produto com variação

**Dado** uma revendedora
**Quando** ela cadastra "Vestido Floral" com preço de venda R$ 199,90 e uma variação P
**Então** o produto e a variação P são criados
**E** a variação recebe SKU (informado ou gerado).

## AC-PROD-003-01 — Produto exige ao menos uma variação

**Dado** o formulário de novo produto
**Quando** a revendedora salva sem nenhuma variação
**Então** uma variação "Único" é criada automaticamente.

## AC-PROD-004-01 — Atributos da variação

**Dado** uma variação
**Então** ela pode registrar tamanho, cor e SKU
**E** o SKU é único na organização quando informado.

## AC-PROD-005-01 — Editar produto

**Dado** um produto existente
**Quando** a revendedora altera o preço de venda
**Então** o novo preço vale para vendas futuras
**E** vendas já registradas mantêm o preço original.

## AC-PROD-006-01 — Desativar sem apagar

**Dado** um produto com histórico de vendas
**Quando** a revendedora o desativa
**Então** ele some das listas de venda e de oferta
**E** continua aparecendo no histórico de vendas
**E** não é possível excluí-lo fisicamente.

## AC-PROD-006-02 — Reativar

**Dado** um produto arquivado
**Quando** a revendedora o reativa
**Então** ele volta às listas.

## AC-PROD-05-margem — Margem estimada

**Dado** custo R$ 60,00 e venda R$ 100,00
**Então** a margem exibida é 40%.
**E dado** venda R$ 0,00, a margem exibida é "--".

## AC-PROD-rls — Isolamento

**Dado** as revendedoras A e B
**Quando** A lista produtos
**Então** vê apenas os seus, nunca os de B.
