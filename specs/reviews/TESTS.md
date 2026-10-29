# TESTS — Avaliação de transação concluída

## Matriz de rastreabilidade

| RF         | AC            | TC                   | Nível                   | Arquivo                                                                           |
| ---------- | ------------- | -------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| RF-REV-001 | AC-REV-001-01 | TC-REV-01            | integration + component | `src/features/reviews/reviews.integration.test.ts`, `components/reviews.test.tsx` |
| RF-REV-001 | AC-REV-001-02 | TC-REV-01            | integration             | idem                                                                              |
| RF-REV-001 | AC-REV-001-03 | TC-REV-02, TC-REV-03 | integration             | idem                                                                              |
| RF-REV-001 | AC-REV-001-04 | TC-REV-03            | integration             | idem                                                                              |
| RF-REV-001 | —             | TC-REV-04            | integration             | idem                                                                              |
| RF-REV-002 | AC-REV-002-01 | TC-REV-01            | integration + component | idem                                                                              |
| RF-REV-003 | AC-REV-003-01 | TC-REV-06            | integration + component | idem                                                                              |
| RF-REV-003 | AC-REV-003-02 | TC-REV-05            | integration             | idem                                                                              |

## Casos de teste

### TC-REV-01 — As duas partes avaliam

- Negociação concluída: compradora (5, comentário com espaços) e vendedora (4, sem comentário) avaliam; `reviewed_org_id` é sempre a outra parte; comentário aparado. Pedido entregue: revendedora e fábrica avaliam.
- **Regra crítica (SDD §38):** sim (autorização)

### TC-REV-02 — Avaliação duplicada

- Segunda avaliação da mesma parte → "Você já avaliou esta transação".

### TC-REV-03 — Transação não concluída e quem não participou

- Negociação pendente → "Só é possível avaliar uma transação concluída"; loja de fora → "Você não tem permissão para esta ação".
- **Regra crítica:** sim (autorização)

### TC-REV-04 — Validação

- Nota 6 e 0 recusadas; comentário de 501 caracteres recusado.

### TC-REV-05 — RLS

- Loja de fora não lê; INSERT direto falha; UPDATE e DELETE diretos não alteram a linha.
- **Regra crítica:** sim (isolamento)

### TC-REV-06 — Média no perfil

- Avaliações 4 (negociação) e 5 (pedido) → média 4,5 e total 2 em `get_reseller_profile`.

## Cobertura de RF

`RF-REV-001..003` ✔
