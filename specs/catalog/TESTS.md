# TESTS — Catálogo

## Matriz de rastreabilidade

| RF          | AC                | TC         | Nível                          |
| ----------- | ----------------- | ---------- | ------------------------------ |
| RF-PROD-001 | AC-PROD-001-01    | TC-PROD-01 | integration                    |
| RF-PROD-001 | AC-PROD-001-02    | TC-PROD-02 | integration                    |
| RF-PROD-001 | AC-PROD-001-03    | TC-PROD-15 | integration                    |
| RF-PROD-001 | AC-PROD-001-04    | TC-PROD-16 | integration                    |
| RF-PROD-001 | AC-PROD-001-05    | TC-PROD-17 | integration                    |
| RF-PROD-001 | AC-PROD-001-06    | TC-PROD-18 | component                      |
| RF-PROD-001 | AC-PROD-rls       | TC-PROD-10 | integration (2 tenants)        |
| RF-PROD-002 | AC-PROD-002-01    | TC-PROD-03 | integration + e2e              |
| RF-PROD-002 | AC-PROD-002-02    | TC-PROD-21 | component + integration + e2e  |
| RF-PROD-003 | AC-PROD-003-01    | TC-PROD-04 | component + integration        |
| RF-PROD-004 | AC-PROD-004-01    | TC-PROD-05 | integration                    |
| RF-PROD-005 | AC-PROD-005-01    | TC-PROD-06 | integration                    |
| RF-PROD-005 | AC-PROD-005-02    | TC-PROD-22 | unit + component + integration |
| RF-PROD-006 | AC-PROD-006-01    | TC-PROD-07 | integration                    |
| RF-PROD-006 | AC-PROD-006-02    | TC-PROD-08 | integration                    |
| RF-PROD-006 | AC-PROD-006-03    | TC-PROD-19 | integration + component + e2e  |
| RF-PROD-006 | AC-PROD-006-04    | TC-PROD-20 | integration                    |
| RF-PROD-005 | AC-PROD-05-margem | TC-PROD-09 | unit                           |
| RF-PROD-002 | AC-PROD-rls       | TC-PROD-10 | integration (2 tenants)        |
| RF-PROD-007 | AC-PROD-007-01    | TC-PROD-11 | unit + component + integration |
| RF-PROD-007 | AC-PROD-007-02    | TC-PROD-12 | component + integration        |
| RF-PROD-007 | AC-PROD-007-03    | TC-PROD-11 | unit + integration             |
| RF-PROD-007 | AC-PROD-007-04    | TC-PROD-13 | integration                    |
| RF-PROD-007 | AC-PROD-007-04    | TC-PROD-14 | integration (trigger)          |

## Casos de teste

### TC-PROD-01 — Criar categoria

integration · não-crítica · categoria vinculada à org; visível só para ela.

### TC-PROD-02 — Categoria duplicada

integration · não-crítica · segunda "Bolsas" → erro de unique `(organization_id, name)`.

### TC-PROD-03 — Cadastrar produto + variação

integration + e2e · não-crítica · produto e variação criados; SKU único.

### TC-PROD-04 — Variação default "Único"

component + integration · não-crítica · salvar sem variação → cria "Único".

### TC-PROD-05 — SKU único

integration · **crítica (integridade)** · SKU repetido na org → erro; permitido em orgs distintas.

### TC-PROD-06 — Editar preço não afeta venda passada

integration · **crítica (integridade histórica)** · alterar `retail_price`; `sale_items` antigos inalterados.

### TC-PROD-07 — Arquivar preserva histórico

integration · **crítica (RF-PROD-006)** · `archived_at` set; some das listas ativas; presente no histórico; `DELETE` bloqueado.

### TC-PROD-08 — Reativar

integration · não-crítica · limpar `archived_at` → volta às listas.

### TC-PROD-09 — Cálculo de margem

unit · não-crítica · `margin(60,100)=0.4`; `margin(x,0)=null`.

### TC-PROD-10 — RLS de catálogo

integration (2 tenants) · **crítica (isolamento)** · A não lê/edita produtos, categorias ou variações de B.

### TC-PROD-11 — Condições de atacado da fábrica

unit + component + integration · não-crítica · pedido mínimo e grade gravados e editáveis; grade normalizada (`wholesale.test.ts`, `wholesale-fields.test.tsx`, `wholesale.integration.test.ts`).

### TC-PROD-12 — Variações geradas pela grade

component + integration · não-crítica · botão "Gerar variantes pela grade"; sem variações → uma por tamanho.

### TC-PROD-13 — Revendedora não define condições

integration · **crítica (autorização)** · campos enviados pela revendedora são ignorados.

### TC-PROD-14 — Trigger de condições só para fábrica

integration · **crítica (autorização)** · `update` direto de `min_order_quantity`/`size_grid` em produto de revendedora → erro.

### TC-PROD-15 — Renomear categoria

integration · não-crítica · nome novo salvo; nome duplicado → erro no campo, nada muda.

### TC-PROD-16 — Arquivar e reativar categoria

integration · não-crítica · arquivada some de `listCategories`, aparece em `listCategoriesForManagement`; produtos mantêm `category_id`.

### TC-PROD-17 — Filtro de produtos por categoria

integration · não-crítica · `listProducts` com `categoryId` devolve só os produtos da categoria, combinando com busca e escopo.

### TC-PROD-18 — Nova categoria no formulário de produto

component · não-crítica · criar pelo formulário adiciona a opção e a seleciona.

### TC-PROD-21 — Gerenciar fotos

component + integration + e2e · não-crítica · "Tornar capa" move a foto para o início; remover apaga o arquivo do Storage; URL que não era do produto é ignorada; foto enviada pela fábrica aparece para a revendedora em `/fornecedores` (E2E).

### TC-PROD-22 — Editar as variações

unit + component + integration · **crítica (estoque)** · `update_product` (migration `0027`) altera preço, cor, tamanho e SKU sem mexer no `stock_on_hand` nem gravar movimento; variação nova entra com movimento `ENTRADA` "Estoque inicial"; variação fora da lista é arquivada com o estoque intacto; SKU repetido → nada muda (nem o nome do produto); lista vazia ou variação de outro produto → erro; outra organização → nada muda; preço negativo → erro no campo (`variants.N.retailPrice`).

### TC-PROD-19 — Arquivar publica na rede

integration + component + e2e · **crítica (estoque)** · `archive_product_to_offers` cria uma oferta por variação com quantidade > 0 e arquiva o produto; quantidade acima do estoque, preço inválido, variação de outro produto ou rede da qual a revendedora não participa → erro e nada muda; outra organização → `not authorized`.

### TC-PROD-20 — Arquivar sem ofertas

integration · não-crítica · lista de itens vazia só arquiva o produto.

### TC-PROD-21 — Falha ao arquivar não mostra sucesso

integration · não-crítica · arquivar/desarquivar produto de outra organização (bloqueado pela RLS) não altera nada e redireciona com toast de erro, nunca de sucesso (VES-54).

## Cobertura de RF

`RF-PROD-001..007` ✔
