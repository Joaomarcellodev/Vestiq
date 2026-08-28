# Especificações — Vestiq MVP

Specification-Driven Development (SDD §29–§33). Nenhuma feature entra em
desenvolvimento sem sua especificação revisada.

## Estrutura

```
specs/
├── _templates/           SPEC.md · ACCEPTANCE.md · TESTS.md em branco
├── auth/
├── organizations/
├── network/
├── catalog/
├── inventory/
├── customers/
├── sales/
├── offers/
├── negotiations/
└── dashboard/
```

Cada feature: `SPEC.md` (o quê e por quê), `ACCEPTANCE.md` (critérios em
Gherkin), `TESTS.md` (casos de teste rastreáveis). `ADR.md` local quando a
decisão é restrita à feature; decisões globais em `docs/adr/`.

## Fluxo

```
PROBLEMA → REQUISITO (RF-*) → USER STORY (US-*) → CRITÉRIOS (AC-*) → CASOS DE TESTE (TC-*)
→ DESIGN TÉCNICO → TASKS → IMPLEMENTAÇÃO → VALIDAÇÃO
```

## Rastreabilidade (meta: 100% — SDD §38)

```
RF-NEG-007 → US-NEG-04 → AC-NEG-07-01 / AC-NEG-07-02 → TC-NEG-07-01 / TC-NEG-07-02 → PR
```

### Índice de features × requisitos

| Feature | Requisitos SDD | Sprint | Status |
| --- | --- | --- | --- |
| [auth](./auth/) | RF-AUTH-001..004 | 1 | 🟨 em implementação |
| [organizations](./organizations/) | RF-AUTH-004; base RF-NET | 1 | ⬜ |
| [network](./network/) | RF-NET-001..008 | 1 / 6 | ⬜ |
| [catalog](./catalog/) | RF-PROD-001..006 | 2 | ⬜ |
| [inventory](./inventory/) | RF-INV-001..006 | 3 | ⬜ |
| [customers](./customers/) | RF-CUSTOMER-001..004 | 3 | ⬜ |
| [sales](./sales/) | RF-SALE-001..009 | 3 | ⬜ |
| [offers](./offers/) | RF-OFFER-001..007 | 4 | ⬜ |
| [negotiations](./negotiations/) | RF-NEG-001..009 | 5 | ⬜ |
| [dashboard](./dashboard/) | RF-DASH-001; RF-FACTORY-DASH-001 | 3→6 | ⬜ |

Cobertura de todos os RF do SDD §9–§18: ✅ mapeados. Nenhum RF do MVP sem feature.

## Convenções de identificador

- `US-<FEATURE>-NN` — user story
- `AC-<RF-SUFFIX>-NN` — critério de aceitação, ancorado no RF
- `TC-<RF-SUFFIX>-NN` — caso de teste, ancorado no RF
- `BR-<FEATURE>-NN` — regra de negócio
