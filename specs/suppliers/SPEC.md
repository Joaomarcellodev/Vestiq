# SPEC-011 — Fornecedores (busca de fornecedores e produtos para reposição)

- **Status:** Implementada
- **Sprint:** pós-MVP
- **Requisitos SDD:** RF-SUP-001..004 (novos — evolução "catálogo de fábrica", SDD §6)
- **Telas:** sem protótipo — segue o padrão visual de `produtos` e `rede`
- **ADRs relacionados:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md) (lógica crítica no Postgres)

## Contexto

A revendedora compra da fábrica que mantém a rede em que ela está. A fábrica já
cadastra seu catálogo no Vestiq, com preço, fotos, pedido mínimo e grade de tamanhos
(SPEC-004 RF-PROD-007). A revendedora, porém, não tem onde ver esse catálogo: o
`products` só é visível para a própria organização (RLS `is_org_member`).

O SDD §6 deixa o "catálogo de atacado da fábrica" fora do MVP e o lista como
evolução ("catálogo de fábrica"). Esta spec entrega a parte de **consulta** dessa
evolução. O pedido B2B continua fora.

## Problema

Para repor o estoque, a revendedora precisa descobrir quais fornecedores tem à
disposição e quais produtos cada um oferece, com preço e condições de atacado.
Hoje ela depende de catálogo em PDF ou de mensagens.

## Objetivo

Dar à revendedora uma área **Fornecedores** onde ela pesquisa, em um só lugar:

- os fornecedores (fábricas) das redes de que participa;
- os produtos desses fornecedores, por nome, marca, categoria, cor, SKU ou
  fornecedor, com preço de atacado, pedido mínimo, grade e disponibilidade.

## Escopo

- Lista e busca de fornecedores.
- Busca de produtos em todos os fornecedores ou em um só.
- Página do fornecedor, com o catálogo dele.
- Detalhe do produto do fornecedor: fotos, descrição, condições de atacado e
  variações (cor, tamanho, SKU, preço, disponibilidade).

## Fora do Escopo

- Pedido/compra B2B, carrinho, pagamento (SDD §6).
- Fornecedores de fora das redes da revendedora (marketplace público — SDD §6).
- Peças de outras revendedoras: continuam em **Rede → ofertas** (SPEC-008).
- Mostrar quantidade em estoque ou custo da fábrica.

## Atores

`RESELLER` (consulta). `FACTORY_ADMIN` mantém o catálogo (SPEC-004) e não usa esta tela.

## Requisitos Relacionados

| RF         | Descrição                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------ |
| RF-SUP-001 | Revendedora lista e pesquisa os fornecedores das redes em que é membro ativo               |
| RF-SUP-002 | Revendedora pesquisa produtos ativos desses fornecedores, em todos ou em um fornecedor     |
| RF-SUP-003 | Revendedora vê o detalhe de um produto do fornecedor, com condições de atacado e variações |
| RF-SUP-004 | Dados internos da fábrica (custo, quantidade em estoque) nunca são expostos                |

## User Stories

| ID        | Como…    | Quero…                            | Para…                                |
| --------- | -------- | --------------------------------- | ------------------------------------ |
| US-SUP-01 | RESELLER | pesquisar fornecedores e produtos | encontrar mercadorias para reposição |

## Regras de Negócio

| ID        | Regra                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-SUP-01 | Fornecedor = organização `FACTORY` ativa, dona de uma rede ativa em que a organização da usuária é membro `ACTIVE`                                                                      |
| BR-SUP-02 | Convite pendente (`INVITED`), membro desativado (`DISABLED`), rede ou fábrica inativa ⇒ o fornecedor não aparece                                                                        |
| BR-SUP-03 | Só aparecem produtos não arquivados; variações arquivadas são ignoradas                                                                                                                 |
| BR-SUP-04 | Busca: cada palavra do termo precisa aparecer (E lógico), sem diferenciar maiúsculas nem acentos, em nome, marca, descrição, SKU interno, categoria, fornecedor, cor ou SKU de variação |
| BR-SUP-05 | Preço exibido = `retail_price` da variação da fábrica (preço de venda dela = preço de atacado para a revendedora); faixa mín–máx quando varia                                           |
| BR-SUP-06 | Disponibilidade é binária (`em estoque` quando `stock_on_hand > 0`); a quantidade não é exposta                                                                                         |
| BR-SUP-07 | `cost_price` e `stock_on_hand` da fábrica nunca saem do banco (RF-SUP-004)                                                                                                              |
| BR-SUP-08 | Resultado da busca de produtos limitado a 100 itens, ordenados por nome                                                                                                                 |

## Fluxo Principal

1. Revendedora abre **Fornecedores** (menu lateral / "Mais").
2. Aba **Produtos** (padrão): digita "vestido preto" → vê cartões com foto, nome,
   fornecedor, faixa de preço, pedido mínimo e disponibilidade.
3. Toca em um produto → detalhe com fotos, condições de atacado e variações.
4. Toca no fornecedor → catálogo só daquele fornecedor, também pesquisável.

## Fluxos Alternativos

- Aba **Fornecedores**: pesquisa por nome; cada cartão mostra as redes e a
  quantidade de produtos ativos.
- Sem rede ativa → estado vazio explicando que os fornecedores vêm das redes.
- Busca sem resultado → estado vazio "Nenhum produto encontrado".
- Produto/fornecedor fora das redes (URL digitada) → 404.

## Estados

Somente leitura; não há estados próprios.

## Critérios de Aceitação

Ver [`ACCEPTANCE.md`](./ACCEPTANCE.md).

## Modelo de Dados

Nenhuma tabela nova. Migration `0017_supplier_search`:

- extensão `unaccent` (schema `extensions`);
- `auth_supplier_ids()` — fábricas visíveis para a usuária (BR-SUP-01/02);
- `list_suppliers(p_query)`, `search_supplier_products(p_query, p_supplier_id)`,
  `get_supplier_product(p_product_id)`, `list_supplier_product_variants(p_product_id)`.

## Segurança

As RLS de `products`/`product_variants` **não** são abertas: uma policy de `select`
liberaria a linha inteira, inclusive `cost_price` e `stock_on_hand`. O acesso passa
por funções `SECURITY DEFINER` (`search_path = ''`). Elas:

- filtram por `auth_supplier_ids()`, derivado de `auth.uid()` (sem parâmetro de org
  forjável);
- devolvem só colunas públicas (RF-SUP-004);
- têm `execute` revogado de `anon`/`public` e concedido a `authenticated`.

## Casos de Erro

| Situação                          | Resposta esperada                |
| --------------------------------- | -------------------------------- |
| Produto de fábrica fora das redes | 404 (a função não devolve linha) |
| Fornecedor fora das redes         | 404                              |
| Termo com `%`, `_` ou `\`         | tratado como texto literal       |
| Usuária anônima                   | sem permissão de execução        |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [x] Migration `0017` (funções + grants) e tipos regenerados
- [x] `src/features/suppliers/queries.ts`
- [x] Telas `/fornecedores`, `/fornecedores/[id]`, `/fornecedores/produtos/[id]`
- [x] Navegação (sidebar + "Mais") só para `RESELLER`
- [x] Seed: catálogo demo da Fábrica Modah
- [x] Testes de integração (visibilidade, busca, colunas expostas) e E2E
