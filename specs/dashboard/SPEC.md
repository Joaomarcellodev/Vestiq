# SPEC-010 — Dashboards (Revendedora e Fábrica)

- **Status:** Rascunho
- **Sprint:** 3→6 (revendedora incremental) · 6 (fábrica)
- **Requisitos SDD:** RF-DASH-001, RF-FACTORY-DASH-001; SDD §17, §18
- **Telas:** `vestiq_dashboard` (revendedora). Dashboard da fábrica: nova tela.

## Problema

Cada perfil precisa de uma visão rápida e confiável do que importa — sem que o
dashboard da fábrica exponha dados comerciais privados das revendedoras.

## Objetivo

- **Revendedora:** indicadores operacionais e financeiros do próprio negócio +
  atalhos (registrar venda, ver rede, repor estoque).
- **Fábrica:** indicadores agregados de adoção e atividade da rede.

## Escopo

### Dashboard da revendedora (RF-DASH-001)

- Estoque atual (nº de itens/variações) e produtos com estoque baixo.
- Vendas e faturamento do período; ticket médio.
- Produtos mais vendidos.
- Ofertas ativas; negociações pendentes.
- Destaques da rede (ofertas recentes de peers).
- CTA "Registrar Venda".

### Dashboard da fábrica (RF-FACTORY-DASH-001)

- Revendedoras cadastradas e ativas.
- Quantidade de ofertas.
- Negociações iniciadas e concluídas.
- Taxa de utilização da plataforma (ex.: % de revendedoras com atividade no mês).

## Fora do Escopo

- Analytics avançado, filtros de período customizados, exportação (pós-MVP).
- Qualquer indicador da fábrica que revele faturamento/margem/clientes de uma
  revendedora específica (SDD §18 — proibido).

## Atores

`RESELLER` (seu dashboard), `FACTORY_ADMIN` (dashboard da rede).

## Requisitos Relacionados

| RF                  | Descrição                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-DASH-001         | Dashboard da revendedora com estoque, estoque baixo, vendas, faturamento, ticket médio, mais vendidos, ofertas ativas, negociações pendentes                  |
| RF-FACTORY-DASH-001 | Dashboard da fábrica com revendedoras cadastradas/ativas, ofertas, negociações iniciadas/concluídas, taxa de utilização — sem expor dados comerciais privados |

## User Stories

| ID         | Como…         | Quero…                                    | Para…                        |
| ---------- | ------------- | ----------------------------------------- | ---------------------------- |
| US-DASH-01 | RESELLER      | ver meu faturamento e ticket médio do mês | saber como vou               |
| US-DASH-02 | RESELLER      | ver o que está com estoque baixo          | repor a tempo                |
| US-DASH-03 | RESELLER      | ver negociações pendentes                 | não deixar ninguém esperando |
| US-DASH-04 | FACTORY_ADMIN | ver quantas revendedoras estão ativas     | medir a adoção               |
| US-DASH-05 | FACTORY_ADMIN | ver negociações iniciadas vs concluídas   | avaliar o valor da rede      |

## Regras de Negócio

| ID         | Regra                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-DASH-01 | Todos os números da revendedora derivam apenas dos dados da própria organização (RLS)                                                            |
| BR-DASH-02 | Faturamento e ticket médio consideram só vendas `CONFIRMED` no período (default: mês corrente)                                                   |
| BR-DASH-03 | Ticket médio = faturamento / nº de vendas confirmadas no período (0 se não houver)                                                               |
| BR-DASH-04 | "Mais vendidos" = ranking por soma de `quantity` em `sale_items` de vendas confirmadas                                                           |
| BR-DASH-05 | Estoque baixo usa o mesmo limiar da feature `inventory`                                                                                          |
| BR-DASH-06 | Dashboard da fábrica usa **apenas agregados de contagem** por rede: `count(distinct reseller)`, `count(offers)`, `count(negotiations by status)` |
| BR-DASH-07 | É proibido no dashboard da fábrica: valores de venda, faturamento, margem, nomes de clientes, itens vendidos por revendedora (SDD §18)           |
| BR-DASH-08 | "Revendedora ativa" (fábrica) = com ao menos uma ação relevante (venda, movimento, oferta, negociação) nos últimos 30 dias                       |
| BR-DASH-09 | "Taxa de utilização" = revendedoras ativas / revendedoras com vínculo ativo                                                                      |
| BR-DASH-10 | Cada card tem estado vazio próprio (sem vendas, sem ofertas, etc.)                                                                               |

## Fluxos

Leitura agregada em `queries.ts` (várias consultas paralelas, cada uma limitada
por RLS). Renderização em cards (bento) conforme design. Sem escrita.

## Segurança

- Dashboard da revendedora: RLS já garante o escopo; nenhuma query cross-org.
- Dashboard da fábrica: consultas usam **views agregadas** (`security definer`,
  `security_barrier`) que só retornam contagens por `network_id` da fábrica do
  usuário. Nenhuma view expõe linha de venda/cliente.
- Teste dedicado: a resposta do endpoint do dashboard da fábrica não contém
  nenhum campo monetário nem identificador de cliente.

## Casos de Erro

| Situação              | Resposta                                            |
| --------------------- | --------------------------------------------------- |
| Sem vendas no período | cards com "R$ 0,00" / "sem dados"                   |
| Rede sem revendedoras | estado vazio com CTA "Convidar revendedora"         |
| Falha em uma query    | o card específico mostra erro; os demais renderizam |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] `queries` do dashboard da revendedora (faturamento, ticket, mais vendidos, estoque baixo, ofertas ativas, negociações pendentes, highlights)
- [ ] Views agregadas da rede + `queries` do dashboard da fábrica
- [ ] Componentes de card (bento) + estados vazios
- [ ] Tela do dashboard da revendedora (portar design) e da fábrica (nova)
- [ ] Testes: cálculos, limiar de estoque, **ausência de dados privados na resposta da fábrica**, estados vazios
