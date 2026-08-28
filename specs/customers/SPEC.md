# SPEC-006 — Clientes

- **Status:** Rascunho
- **Sprint:** 3 (Operations)
- **Requisitos SDD:** RF-CUSTOMER-001..004; SDD §13
- **Telas:** `vestiq_clientes`, `vestiq_detalhes_do_cliente`

## Problema

A revendedora precisa manter sua base de clientes e consultar o histórico de
compras de cada um, sem que outras revendedoras acessem esses dados.

## Objetivo

CRUD de clientes; histórico de compras; isolamento estrito por revendedora.

## Escopo

- `customers` + policies (tenant = revendedora).
- Lista com busca (nome/email), filtros (todos/ativos/inativos), contadores.
- Detalhe do cliente: contato, notas internas, total gasto, total de pedidos,
  última compra, histórico de compras (de `sales`).
- Notas internas por cliente.
- Desativação (`archived_at`).

## Fora do Escopo

- Programa de fidelidade / segmentação automática (badges "VIP" são manuais/derivados simples).
- Comunicação/mensageria com o cliente ("Message" no design → fora do MVP ou link `mailto`).

## Atores

`RESELLER`.

## Requisitos Relacionados

| RF              | Descrição                                 |
| --------------- | ----------------------------------------- |
| RF-CUSTOMER-001 | Cadastrar clientes                        |
| RF-CUSTOMER-002 | Editar clientes                           |
| RF-CUSTOMER-003 | Acessar apenas os próprios clientes       |
| RF-CUSTOMER-004 | Consultar histórico de compras do cliente |

## User Stories

| ID        | Como…    | Quero…                                   | Para…                     |
| --------- | -------- | ---------------------------------------- | ------------------------- |
| US-CUS-01 | RESELLER | cadastrar um cliente                     | vincular vendas a ele     |
| US-CUS-02 | RESELLER | editar os dados de um cliente            | manter contato atualizado |
| US-CUS-03 | RESELLER | ver o histórico de compras de um cliente | entender seu perfil       |
| US-CUS-04 | RESELLER | registrar notas internas                 | lembrar preferências      |

## Regras de Negócio

| ID        | Regra                                                                              |
| --------- | ---------------------------------------------------------------------------------- |
| BR-CUS-01 | Cliente pertence a uma organização; nunca compartilhado                            |
| BR-CUS-02 | Nome obrigatório; email/telefone/CPF opcionais                                     |
| BR-CUS-03 | CPF, quando informado, é validado (formato + dígitos) e único por organização      |
| BR-CUS-04 | Total gasto e nº de pedidos derivam de `sales` com `status = CONFIRMED`            |
| BR-CUS-05 | Última compra = `max(sales.created_at)` confirmada                                 |
| BR-CUS-06 | Desativar (`archived_at`) não apaga; some do seletor de venda; histórico permanece |
| BR-CUS-07 | Cliente com vendas não pode ser excluído fisicamente                               |
| BR-CUS-08 | "Ativo" = teve compra confirmada nos últimos 12 meses (derivado)                   |

## Fluxos

**Cadastro/edição:** formulário (nome, email, telefone, CPF, endereço opcional).

**Detalhe:** cards de total gasto / pedidos / última compra + lista de compras
(order id, data, itens, status) paginada + notas internas.

## Estados

Cliente: `ativo ↔ inativo` (derivado por recência) e `arquivado`.

## Segurança

`customers`: `is_org_member(organization_id)` para `select` e `all`. Histórico
puxa de `sales`/`sale_items` já isolados. Notas internas nunca saem da organização.

## Casos de Erro

| Situação                      | Resposta                         |
| ----------------------------- | -------------------------------- |
| Nome vazio                    | erro de campo                    |
| CPF inválido                  | "CPF inválido"                   |
| CPF duplicado na organização  | "Cliente com este CPF já existe" |
| Acesso a cliente de outra org | 404 / RLS vazio                  |
| Excluir cliente com vendas    | bloqueado; oferecer desativar    |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migration `customers` + policies + unique CPF por org
- [ ] Actions: `createCustomer`, `updateCustomer`, `archiveCustomer`, `addCustomerNote`
- [ ] `queries`: `listCustomers` (busca/filtro), `getCustomerWithHistory`
- [ ] `utils/cpf.ts` (validação)
- [ ] Telas: lista e detalhe
- [ ] Testes: validação de CPF, agregados, RLS (2 tenants)
