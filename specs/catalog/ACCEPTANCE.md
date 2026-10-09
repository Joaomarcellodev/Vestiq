# ACCEPTANCE — Catálogo

## AC-PROD-001-01 — Criar categoria

**Dado** uma revendedora autenticada
**Quando** ela cria a categoria "Bolsas"
**Então** a categoria existe vinculada à organização dela.

## AC-PROD-001-02 — Categoria duplicada

**Dado** a categoria "Bolsas" já existente na organização
**Quando** a revendedora tenta criar "Bolsas" de novo
**Então** recebe erro de nome duplicado.

## AC-PROD-001-03 — Renomear categoria

**Dado** a categoria "Bolsas" da revendedora
**Quando** ela renomeia para "Bolsas e carteiras"
**Então** o novo nome aparece na tela de categorias, no formulário e no filtro de produtos
**E** um nome que já existe na organização é recusado com erro no campo.

## AC-PROD-001-04 — Arquivar e reativar categoria

**Dado** a categoria "Bolsas" com produtos vinculados
**Quando** a revendedora arquiva a categoria
**Então** ela some da seleção do formulário de produto e do filtro
**E** os produtos continuam vinculados a ela (BR-CAT-10)
**E** a categoria pode ser reativada na tela de categorias.

## AC-PROD-001-05 — Filtrar produtos por categoria

**Dado** produtos em "Bolsas" e em "Calçados"
**Quando** a revendedora escolhe "Bolsas" no filtro de /produtos
**Então** só os produtos de "Bolsas" aparecem
**E** o filtro combina com a busca e com Ativos/Arquivados.

## AC-PROD-001-06 — Criar categoria pelo formulário de produto

**Dado** o formulário de novo produto ou de edição
**Quando** a revendedora cria uma categoria por ali
**Então** a categoria é criada e já fica selecionada no produto.

## AC-PROD-002-01 — Cadastrar produto com variação

**Dado** uma revendedora
**Quando** ela cadastra "Vestido Floral" com preço de venda R$ 199,90 e uma variação P
**Então** o produto e a variação P são criados
**E** a variação recebe SKU (informado ou gerado).

## AC-PROD-002-02 — Gerenciar as fotos do produto

**Dado** um produto com fotos (da revendedora ou da fábrica)
**Quando** a dona do catálogo edita o produto
**Então** ela adiciona fotos (até 5), remove fotos e escolhe a foto de capa (a primeira)
**E** as fotos removidas são apagadas do bucket `product-images`
**E** o servidor só aceita manter fotos que já eram do produto
**E** no formulário da fábrica há o aviso de que essas fotos aparecem para as revendedoras em Fornecedores.

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

## AC-PROD-006-03 — Arquivar publica as peças na rede

**Dado** uma revendedora de uma rede ativa com um produto que tem variações em estoque
**Quando** ela arquiva o produto
**Então** vê cada variação com estoque, já preenchida com todo o estoque e o preço de custo
**E** ao confirmar, cada variação com quantidade > 0 vira uma oferta ativa na rede escolhida
**E** o produto e as variações ficam arquivados (somem das vendas, aparecem em "Arquivados")
**E** tudo acontece numa transação: se uma oferta for inválida, nada é arquivado.

## AC-PROD-006-04 — Arquivar sem rede ou sem estoque

**Dado** um produto sem estoque, ou uma revendedora que não participa de nenhuma rede
**Quando** ela arquiva o produto
**Então** o produto só é arquivado, com o aviso de que nenhuma oferta foi publicada.

## AC-PROD-05-margem — Margem estimada

**Dado** custo R$ 60,00 e venda R$ 100,00
**Então** a margem exibida é 40%.
**E dado** venda R$ 0,00, a margem exibida é "--".

## AC-PROD-007-01 — Fábrica define as condições de atacado

**Dado** uma fábrica autenticada
**Quando** ela cadastra "Vestido Midi" com pedido mínimo 12 e grade "P, M, G, GG"
**Então** o produto guarda pedido mínimo 12 e a grade P, M, G, GG, nessa ordem
**E** o detalhe do produto mostra "Pedido mínimo: 12 peças" e os tamanhos da grade.

## AC-PROD-007-02 — Variações a partir da grade

**Dado** uma fábrica que informou a grade "36, 38, 40" e nenhuma variação
**Quando** ela salva o produto
**Então** são criadas as variações 36, 38 e 40.

## AC-PROD-007-03 — Pedido mínimo inválido

**Dado** o formulário da fábrica
**Quando** o pedido mínimo é 0 ou fracionado
**Então** o produto não é salvo e a mensagem explica o limite.

## AC-PROD-007-04 — Só a fábrica define

**Dado** uma revendedora
**Quando** ela cadastra um produto (mesmo enviando pedido mínimo/grade)
**Então** o produto fica sem pedido mínimo e sem grade
**E** gravar esses campos direto no banco é recusado.

## AC-PROD-rls — Isolamento

**Dado** as revendedoras A e B
**Quando** A lista produtos
**Então** vê apenas os seus, nunca os de B.
