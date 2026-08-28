# SPEC-004 — Catálogo (Categorias, Produtos, Variações)

- **Status:** Rascunho
- **Sprint:** 2 (Catalog)
- **Requisitos SDD:** RF-PROD-001..006; SDD §11, §21 (domínio produto × variação)
- **Telas:** `vestiq_novo_produto`, `vestiq_detalhes_do_produto`, `vestiq_invent_rio`
- **ADRs:** [0008](../../docs/adr/0008-currency-brl.md)

## Problema

A revendedora precisa cadastrar e manter seu catálogo, diferenciando o **produto**
(ex.: "Camiseta Básica") de suas **variações comerciais** (Preto/P, Preto/M…),
cada uma com identificador e controle de estoque próprios.

## Objetivo

CRUD de categorias, produtos e variações; SKU por variação; edição; desativação
sem apagar histórico.

## Escopo

- `categories`, `products`, `product_variants` + policies (tenant = revendedora).
- Formulário "Novo Produto" (mídia, básicas, precificação, variantes) conforme design.
- Detalhe do produto com tabela de variações e resumo financeiro (margem).
- Desativação (`archived_at`) de produto/variação/categoria.
- Upload de imagens do produto (Supabase Storage, bucket por organização).

## Fora do Escopo

- Estoque em si (movimentações) → feature `inventory` (aqui só o campo de saldo).
- Código de barras / leitor → pós-MVP (o botão "Escanear" fica desabilitado).
- Catálogo de atacado da fábrica (SDD §6).

## Atores

`RESELLER`.

## Requisitos Relacionados

| RF          | Descrição                                |
| ----------- | ---------------------------------------- |
| RF-PROD-001 | Cadastrar categorias                     |
| RF-PROD-002 | Cadastrar produtos                       |
| RF-PROD-003 | Produtos possuem variações               |
| RF-PROD-004 | Variação: tamanho, cor, SKU              |
| RF-PROD-005 | Editar produtos                          |
| RF-PROD-006 | Desativar produtos sem excluir histórico |

## User Stories

| ID        | Como…    | Quero…                                             | Para…                                  |
| --------- | -------- | -------------------------------------------------- | -------------------------------------- |
| US-CAT-01 | RESELLER | criar categorias                                   | organizar o catálogo                   |
| US-CAT-02 | RESELLER | cadastrar um produto com fotos, preços e variações | disponibilizá-lo para venda            |
| US-CAT-03 | RESELLER | editar um produto                                  | corrigir dados e preços                |
| US-CAT-04 | RESELLER | desativar um produto que saiu de linha             | limpar a listagem sem perder histórico |
| US-CAT-05 | RESELLER | ver a margem estimada de uma variação              | precificar melhor                      |

## Regras de Negócio

| ID        | Regra                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| BR-CAT-01 | `categories.name` único por organização                                                                        |
| BR-CAT-02 | Produto pertence a uma organização; opcionalmente a uma categoria                                              |
| BR-CAT-03 | Produto tem 1..N variações; ao menos uma é criada com o produto (tamanho "Único" quando não aplicável)         |
| BR-CAT-04 | `sku`/`internal_sku` únicos por organização quando informados                                                  |
| BR-CAT-05 | `retail_price >= 0`, `cost_price >= 0` (BRL, `numeric(12,2)`)                                                  |
| BR-CAT-06 | Margem estimada = `(retail_price - cost_price) / retail_price` quando `retail_price > 0`, senão `--`           |
| BR-CAT-07 | Desativar = `archived_at = now()`; registros e histórico permanecem (RF-PROD-006)                              |
| BR-CAT-08 | Produto/variação arquivada não aparece em listas de venda nem pode ser ofertada; continua visível no histórico |
| BR-CAT-09 | Não é permitido `DELETE` físico de produto/variação com movimentações ou itens de venda                        |
| BR-CAT-10 | Desativar categoria não desativa seus produtos; apenas some da seleção                                         |

## Fluxos

**Novo produto:** upload de imagens → dados básicos (nome, SKU interno, categoria,
descrição) → precificação (custo, venda, margem calculada) → variantes (quantidade
inicial de estoque, tamanho, cor) → salvar. A quantidade inicial gera um movimento
`ENTRADA` (via `inventory`).

**Editar:** mesmos campos; alterações de preço não afetam vendas passadas.

**Desativar:** confirma → `archived_at`.

## Estados

Produto/variação/categoria: `ativo → arquivado` (reversível: limpar `archived_at`).

## Segurança

Todas as tabelas: `is_org_member(organization_id)` para `select` e `all`.
`product_variants.organization_id` é denormalizado do produto (mantido por trigger)
para policies simples. Storage: bucket privado, path `org/<id>/products/...`,
policy por organização.

## Casos de Erro

| Situação                              | Resposta                                              |
| ------------------------------------- | ----------------------------------------------------- |
| Nome de produto vazio                 | erro de campo                                         |
| SKU duplicado na organização          | "SKU já utilizado"                                    |
| Preço de venda < 0                    | erro de campo                                         |
| Upload > 10 MB ou tipo inválido       | "Envie PNG/JPG até 10 MB"                             |
| Desativar produto com venda em aberto | permitido (histórico preservado), mas some das listas |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migrations `categories`, `products`, `product_variants` + policies + trigger de denormalização
- [ ] Storage bucket + policies
- [ ] Actions: `createCategory`, `createProduct` (com variações + entrada inicial), `updateProduct`, `archiveProduct`, `archiveVariant`
- [ ] `validation.ts` (Zod) para produto/variação
- [ ] Telas: novo produto, detalhe do produto, lista/inventário
- [ ] `utils/currency.ts` + `MoneyInput` + cálculo de margem
- [ ] Testes: unicidade de SKU, margem, arquivamento, RLS
