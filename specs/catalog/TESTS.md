# TESTS — Catálogo

## Matriz de rastreabilidade

| RF          | AC                | TC         | Nível                   |
| ----------- | ----------------- | ---------- | ----------------------- |
| RF-PROD-001 | AC-PROD-001-01    | TC-PROD-01 | integration             |
| RF-PROD-001 | AC-PROD-001-02    | TC-PROD-02 | integration             |
| RF-PROD-002 | AC-PROD-002-01    | TC-PROD-03 | integration + e2e       |
| RF-PROD-003 | AC-PROD-003-01    | TC-PROD-04 | component + integration |
| RF-PROD-004 | AC-PROD-004-01    | TC-PROD-05 | integration             |
| RF-PROD-005 | AC-PROD-005-01    | TC-PROD-06 | integration             |
| RF-PROD-006 | AC-PROD-006-01    | TC-PROD-07 | integration             |
| RF-PROD-006 | AC-PROD-006-02    | TC-PROD-08 | integration             |
| RF-PROD-005 | AC-PROD-05-margem | TC-PROD-09 | unit                    |
| RF-PROD-002 | AC-PROD-rls       | TC-PROD-10 | integration (2 tenants) |

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

## Cobertura de RF

`RF-PROD-001..006` ✔
