# TESTS — Fornecedores

## Matriz de rastreabilidade

| RF              | AC                           | TC                   | Nível       | Arquivo                                                |
| --------------- | ---------------------------- | -------------------- | ----------- | ------------------------------------------------------ |
| RF-SUP-001      | AC-SUP-001-01                | TC-SUP-01            | integration | `src/features/suppliers/suppliers.integration.test.ts` |
| RF-SUP-001      | AC-SUP-001-02                | TC-SUP-02            | integration | idem                                                   |
| RF-SUP-001      | AC-SUP-001-03                | TC-SUP-03            | integration | idem                                                   |
| RF-SUP-002      | AC-SUP-002-01, AC-SUP-002-02 | TC-SUP-04, TC-SUP-05 | integration | idem                                                   |
| RF-SUP-002      | AC-SUP-002-03                | TC-SUP-06            | integration | idem                                                   |
| RF-SUP-002      | AC-SUP-002-04                | TC-SUP-07            | integration | idem                                                   |
| RF-SUP-003      | AC-SUP-003-01, AC-SUP-003-02 | TC-SUP-08, TC-SUP-09 | integration | idem                                                   |
| RF-SUP-004      | AC-SUP-004-01                | TC-SUP-10            | integration | idem                                                   |
| RF-SUP-001..003 | AC-SUP-002-01, AC-SUP-003-01 | TC-SUP-11            | e2e         | `e2e/suppliers.spec.ts`                                |

## Casos de teste

### TC-SUP-01 — Lista os fornecedores das redes ativas

- **Nível:** integration
- **Pré-condições:** fábrica com rede; revenda membro `ACTIVE`; 2 produtos ativos
- **Passos:** `listSuppliers()` como a revendedora
- **Resultado esperado:** a fábrica aparece com o nome da rede e `productCount = 2`
- **Regra crítica (SDD §38):** sim (isolamento multi-tenant)

### TC-SUP-02 — Fábricas fora das redes, convite pendente e membro desativado ficam de fora

- **Nível:** integration
- **Pré-condições:** outra fábrica sem vínculo; fábrica com convite `INVITED`; fábrica com membro `DISABLED`
- **Passos:** `listSuppliers()`; `searchSupplierProducts()`
- **Resultado esperado:** nenhuma dessas fábricas nem seus produtos aparecem
- **Regra crítica (SDD §38):** sim

### TC-SUP-03 — Busca de fornecedor por nome

- **Nível:** integration
- **Passos:** `listSuppliers("modah")`
- **Resultado esperado:** só o fornecedor cujo nome contém o termo

### TC-SUP-04 — Busca de produto por várias palavras (E lógico, inclui cor da variação)

- **Nível:** integration
- **Passos:** `searchSupplierProducts("vestido preto")`
- **Resultado esperado:** só o vestido com variação preta; faixa de preço e pedido mínimo corretos

### TC-SUP-05 — Busca sem acento/maiúsculas e com curingas literais

- **Nível:** integration
- **Passos:** `searchSupplierProducts("CAMISA LINHO")`; `searchSupplierProducts("100%")`
- **Resultado esperado:** acha "Camisa de Línho"; `%` não casa tudo

### TC-SUP-06 — Produtos arquivados ficam de fora

- **Nível:** integration
- **Resultado esperado:** produto com `archived_at` não aparece; variação arquivada não entra na faixa de preço

### TC-SUP-07 — Filtro por fornecedor

- **Nível:** integration
- **Passos:** `searchSupplierProducts(undefined, supplierId)`; `getSupplier(id)`
- **Resultado esperado:** só produtos daquele fornecedor; `getSupplier` de fábrica estranha = `null`

### TC-SUP-08 — Detalhe do produto com variações

- **Nível:** integration
- **Resultado esperado:** `getSupplierProduct(id)` devolve dados, condições de atacado e variações com `inStock`

### TC-SUP-09 — Detalhe de produto fora das redes

- **Nível:** integration
- **Resultado esperado:** `getSupplierProduct(id)` = `null`
- **Regra crítica (SDD §38):** sim

### TC-SUP-10 — Custo e quantidade não expostos; leitura direta bloqueada

- **Nível:** integration
- **Passos:** chamar os RPCs direto pelo client; `select` em `products`/`product_variants` da fábrica
- **Resultado esperado:** nenhuma chave `cost_price`/`stock_on_hand` no retorno; `select` direto vazio
- **Regra crítica (SDD §38):** sim

### TC-SUP-11 — Jornada da revendedora (E2E)

- **Nível:** e2e
- **Passos:** login `revenda@vestiq.dev` → Fornecedores → pesquisar → abrir produto → abrir fornecedor
- **Resultado esperado:** produto do seed da Fábrica Modah aparece com preço e condições de atacado
