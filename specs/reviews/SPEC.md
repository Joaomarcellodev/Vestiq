# SPEC-016 — Avaliação de transação concluída

- **Status:** Implementada
- **Sprint:** 6
- **Requisitos SDD:** RF-REV-001..003 (novos — reputação na rede)
- **Jira:** VES-42 (HU14), subtarefa VES-47
- **Telas:** bloco "Avaliação" em `/negociacoes/[id]` e `/pedidos/[id]`; nota no perfil público (`/rede/revendedoras/[id]`)
- **ADRs relacionados:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md)
- **Depende de:** [SPEC-003 Rede](../network/SPEC.md) (perfil público, VES-65), [SPEC-009 Negociações](../negotiations/SPEC.md), [SPEC-012 Pedidos](../supply-orders/SPEC.md) (entrega, VES-32)

## Problema

Uma revendedora não tem como saber, antes de negociar, se a outra loja cumpre
o combinado. Sem reputação, a rede depende de conhecer as pessoas.

## Objetivo

Cada parte de uma transação concluída avalia a outra (nota de 1 a 5 e
comentário opcional); a média e o número de avaliações aparecem no perfil
público da revendedora.

## Escopo

- Avaliar a outra parte de uma **negociação concluída** (revendedora ↔ revendedora).
- Avaliar a outra parte de um **pedido de abastecimento entregue** (revendedora ↔ fábrica).
- Ver, na própria transação, a avaliação que fez e a que recebeu.
- Média (uma casa decimal) e total de avaliações no perfil público.

## Fora do Escopo

- Editar ou apagar uma avaliação (BR-REV-02).
- Listar os comentários no perfil público — só a média e o total.
- Notificar a parte avaliada.
- Responder a uma avaliação.

## Requisitos

| ID         | Requisito                                                                     |
| ---------- | ----------------------------------------------------------------------------- |
| RF-REV-001 | Parte de uma transação concluída avalia a outra parte (nota 1–5 + comentário) |
| RF-REV-002 | Cada parte vê a avaliação que fez e a que recebeu naquela transação           |
| RF-REV-003 | Perfil público mostra a média e o número de avaliações recebidas              |

## User Stories

| ID        | Como…                         | Quero…                   | Para…                                  |
| --------- | ----------------------------- | ------------------------ | -------------------------------------- |
| US-REV-01 | participante de uma transação | avaliar a outra parte    | ajudar a construir a reputação na rede |
| US-REV-02 | revendedora                   | ver a nota de outra loja | decidir com quem negociar              |

## Regras de Negócio

| ID        | Regra                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| BR-REV-01 | Só se avalia negociação `COMPLETED` ou pedido `DELIVERED`                                                                      |
| BR-REV-02 | Uma avaliação por parte e por transação (índices únicos parciais); não se edita nem se apaga                                   |
| BR-REV-03 | Só um membro ativo de uma das partes avalia; a parte avaliada é sempre a outra (derivada no banco, nunca enviada pelo cliente) |
| BR-REV-04 | A média do perfil considera todas as avaliações recebidas pela loja (negociações e pedidos), arredondada a 1 casa              |
| BR-REV-05 | Comentário opcional, até 500 caracteres (espaços nas pontas removidos; vazio = sem comentário)                                 |

## Dados

`reviews` (migration 0045): `negotiation_id` **ou** `supply_order_id` (exatamente
um), `reviewer_org_id`, `reviewed_org_id`, `rating` (1–5), `comment`, `created_by`,
`created_at`.

## Segurança

- RLS `reviews_select_parties`: só membros da parte que avaliou ou da avaliada leem a linha.
- Sem policy de INSERT/UPDATE/DELETE: a escrita é só pela função `submit_review`
  (SECURITY DEFINER), que valida participação, status e unicidade.
- O perfil público expõe apenas agregados (`get_reseller_profile`).

## Casos de Erro

| Situação                              | Resposta                                        |
| ------------------------------------- | ----------------------------------------------- |
| Transação não concluída               | "Só é possível avaliar uma transação concluída" |
| Segunda avaliação da mesma parte      | "Você já avaliou esta transação"                |
| Quem não é parte                      | "Você não tem permissão para esta ação"         |
| Nota fora de 1–5                      | "Escolha uma nota de 1 a 5"                     |
| Comentário com mais de 500 caracteres | "Use no máximo 500 caracteres no comentário"    |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).
