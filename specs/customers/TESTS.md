# TESTS — Clientes

## Matriz de rastreabilidade

| RF              | AC                  | TC        | Nível                   |
| --------------- | ------------------- | --------- | ----------------------- |
| RF-CUSTOMER-001 | AC-CUSTOMER-001-01  | TC-CUS-01 | integration             |
| RF-CUSTOMER-001 | AC-CUSTOMER-001-02  | TC-CUS-02 | unit                    |
| RF-CUSTOMER-001 | AC-CUSTOMER-001-03  | TC-CUS-03 | integration             |
| RF-CUSTOMER-002 | AC-CUSTOMER-002-01  | TC-CUS-04 | integration             |
| RF-CUSTOMER-003 | AC-CUSTOMER-003-01  | TC-CUS-05 | integration (2 tenants) |
| RF-CUSTOMER-004 | AC-CUSTOMER-004-01  | TC-CUS-06 | integration             |
| RF-CUSTOMER-004 | AC-CUSTOMER-004-02  | TC-CUS-07 | component               |
| RF-CUSTOMER-003 | AC-CUSTOMER-notes   | TC-CUS-08 | integration             |
| RF-CUSTOMER-001 | AC-CUSTOMER-archive | TC-CUS-09 | integration             |

## Casos de teste

### TC-CUS-01 — Criar cliente

integration · não-crítica · cliente vinculado à org.

### TC-CUS-02 — Validação de CPF

unit · não-crítica · `isValidCPF` cobre formato, dígitos verificadores, sequências repetidas.

### TC-CUS-03 — CPF único por organização

integration · **crítica (integridade)** · duplicado na mesma org → erro; permitido em org distinta.

### TC-CUS-04 — Editar cliente

integration · não-crítica · update reflete; `updated_at` muda.

### TC-CUS-05 — RLS de clientes

integration (2 tenants) · **crítica (isolamento — RF-CUSTOMER-003)** · A não lê/edita clientes de B; acesso direto → vazio.

### TC-CUS-06 — Agregados do histórico

integration · **crítica (correção)** · total gasto = soma de vendas `CONFIRMED`; cancelada não conta; última compra correta.

### TC-CUS-07 — Estado vazio

component · não-crítica · cliente sem venda → empty state + totais zerados.

### TC-CUS-08 — Notas internas isoladas

integration · **crítica (privacidade)** · nota não aparece para outra org.

### TC-CUS-09 — Desativar preserva histórico

integration · **crítica** · `archived_at` set; some do seletor; vendas intactas; `DELETE` bloqueado.

## Cobertura de RF

`RF-CUSTOMER-001..004` ✔
