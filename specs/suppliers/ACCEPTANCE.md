# ACCEPTANCE — Fornecedores

Critérios em Gherkin. Cada critério ancora em um RF e é coberto por ao menos um
`TC-*` em `TESTS.md`.

## AC-SUP-001-01 — Fornecedores das minhas redes

**Dado** que minha revenda é membro `ACTIVE` da rede da "Fábrica Modah"
**Quando** abro Fornecedores → aba Fornecedores
**Então** vejo "Fábrica Modah", o nome da rede e a quantidade de produtos ativos

## AC-SUP-001-02 — Fornecedores de fora das minhas redes não aparecem

**Dado** uma fábrica cuja rede não inclui minha revenda
**Ou** um convite ainda pendente, ou minha participação desativada
**Quando** listo os fornecedores
**Então** essa fábrica não aparece

## AC-SUP-001-03 — Pesquisar fornecedor pelo nome

**Dado** que tenho os fornecedores "Fábrica Modah" e "Malharia Sul"
**Quando** pesquiso "modah"
**Então** vejo apenas "Fábrica Modah"

## AC-SUP-002-01 — Pesquisar produtos em todos os fornecedores

**Dado** que meus fornecedores têm "Vestido Midi" (preto) e "Calça Wide"
**Quando** pesquiso "vestido preto"
**Então** vejo "Vestido Midi" com fornecedor, faixa de preço e pedido mínimo
**E** não vejo "Calça Wide"

## AC-SUP-002-02 — Busca sem diferenciar acentos e maiúsculas

**Quando** pesquiso "CAMISA LINHO" e o produto se chama "Camisa de Línho"
**Então** o produto aparece

## AC-SUP-002-03 — Produtos arquivados não aparecem

**Dado** um produto arquivado pelo fornecedor
**Quando** pesquiso produtos
**Então** ele não aparece

## AC-SUP-002-04 — Catálogo de um fornecedor

**Quando** abro a página de um fornecedor
**Então** vejo apenas produtos dele, e posso pesquisar dentro desse catálogo

## AC-SUP-003-01 — Detalhe do produto do fornecedor

**Quando** abro um produto do fornecedor
**Então** vejo fotos, descrição, pedido mínimo, grade e cada variação com cor,
tamanho, SKU, preço e "Em estoque"/"Sem estoque"

## AC-SUP-003-02 — Produto fora das minhas redes

**Quando** acesso a URL de um produto de fábrica fora das minhas redes
**Então** recebo "página não encontrada"

## AC-SUP-004-01 — Dados internos da fábrica protegidos

**Quando** consulto produtos ou variações de um fornecedor por qualquer caminho
(telas ou API)
**Então** `cost_price` e a quantidade em estoque não são devolvidos
**E** a leitura direta de `products`/`product_variants` do fornecedor continua bloqueada
