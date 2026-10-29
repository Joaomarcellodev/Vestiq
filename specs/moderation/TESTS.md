# TESTS — Denúncias e moderação

## Matriz de rastreabilidade

| RF         | AC            | TC                   | Nível                   | Arquivo                                                                            |
| ---------- | ------------- | -------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| RF-MOD-001 | AC-MOD-001-01 | TC-REP-01            | integration + e2e       | `src/features/reports/reports.integration.test.ts`, `e2e/moderation.spec.ts`       |
| RF-MOD-001 | AC-MOD-001-02 | TC-REP-01            | integration             | `src/features/reports/reports.integration.test.ts`                                 |
| RF-MOD-001 | AC-MOD-001-03 | TC-REP-05            | integration             | idem                                                                               |
| RF-MOD-001 | AC-MOD-001-04 | TC-REP-02, TC-REP-03 | integration             | idem                                                                               |
| RF-MOD-001 | —             | TC-REP-04            | integration + component | idem, `src/features/reports/components/reports.test.tsx`                           |
| RF-MOD-002 | AC-MOD-002-01 | TC-MOD-01            | integration + e2e       | `src/features/moderation/moderation.integration.test.ts`, `e2e/moderation.spec.ts` |
| RF-MOD-002 | AC-MOD-002-02 | TC-MOD-01            | e2e + component         | `e2e/moderation.spec.ts`, `src/components/organisms/nav.test.tsx`                  |
| RF-MOD-003 | AC-MOD-003-01 | TC-MOD-02            | integration + e2e       | `src/features/moderation/moderation.integration.test.ts`, `e2e/moderation.spec.ts` |
| RF-MOD-003 | AC-MOD-003-02 | TC-MOD-03            | integration + component | idem, `src/features/moderation/components/moderation-forms.test.tsx`               |
| RF-MOD-003 | AC-MOD-003-03 | TC-MOD-04, TC-MOD-06 | integration             | `src/features/moderation/moderation.integration.test.ts`                           |
| RF-MOD-004 | AC-MOD-004-01 | TC-MOD-05            | integration             | idem, `src/features/auth/auth.integration.test.ts`                                 |

## Casos de teste

### TC-REP-01 — Denunciar oferta, conversa e revendedora

- O denunciante e a loja denunciada são derivados no banco; descrição aparada; volta ao alvo com toast.

### TC-REP-02 — Denúncia aberta repetida

- Segunda denúncia aberta do mesmo alvo → "Você já denunciou isto. A moderação vai analisar."

### TC-REP-03 — Visibilidade do alvo

- Loja de fora (oferta, negociação, revendedora), colega que não é parte da negociação, fábrica como alvo → recusados; própria oferta → "Você não pode denunciar a sua própria loja".
- **Regra crítica (SDD §38):** sim (autorização)

### TC-REP-04 — Validação

- Sem motivo; descrição de 1001 caracteres.

### TC-REP-05 — Sigilo (RLS)

- Denunciante vê só as próprias; loja denunciada vê zero; INSERT direto falha.
- **Regra crítica:** sim (privacidade)

### TC-MOD-01 — Acesso ao painel

- Revendedora: `listModerationReports` → 404; `list_moderation_reports` vazio; `moderate_report` → not authorized. Admin vê a fila com o rótulo do alvo, a loja, quem denunciou e o total aberto contra a loja.
- **Regra crítica:** sim (autorização)

### TC-MOD-02 — Arquivar

- Motivo obrigatório; arquivada com nota; decidir de novo → "Esta denúncia já foi resolvida".

### TC-MOD-03 — Remover oferta

- Só em denúncia de oferta; oferta `CANCELLED`; as duas denúncias abertas dela `ACTIONED`; `moderation_actions` com oferta, motivo e autor.

### TC-MOD-04 — Suspender

- Loja suspensa: `listMyOrganizations` vazio, `products` vazio, `get_my_suspension` com o motivo; colegas: perfil 404 e vitrine vazia.
- **Regra crítica:** sim (isolamento)

### TC-MOD-05 — Login de loja suspensa

- `signInWithPassword` recusa com a mensagem e o motivo e fecha a sessão aberta.

### TC-MOD-06 — Reativar

- Motivo obrigatório; acesso e ofertas voltam; histórico `REMOVE_OFFER → SUSPEND_ORGANIZATION → REACTIVATE_ORGANIZATION`; reativar loja ativa e suspender a plataforma recusados.

## Cobertura de RF

`RF-MOD-001..004` ✔
