# Contribuindo com o Vestiq

## Pré-requisitos

- Node.js `>= 20.9` (ver `.nvmrc`)
- npm `>= 10`
- Docker (para `supabase start`)
- Supabase CLI (instalado como devDependency: `npx supabase`)

## Setup

```bash
npm install
cp .env.example .env.local        # preencher com as chaves do Supabase
npx supabase start                # sobe Postgres/Auth locais
npm run db:reset                  # aplica migrations + seed
npm run dev
```

App em `http://localhost:3000`.

## Scripts

| Comando                             | O quê                                      |
| ----------------------------------- | ------------------------------------------ |
| `npm run dev`                       | servidor de desenvolvimento                |
| `npm run build` / `npm start`       | build e execução de produção               |
| `npm run lint` / `npm run lint:fix` | ESLint                                     |
| `npm run typecheck`                 | `tsc --noEmit`                             |
| `npm run format`                    | Prettier                                   |
| `npm test` / `npm run test:watch`   | Vitest                                     |
| `npm run test:coverage`             | cobertura                                  |
| `npm run test:e2e`                  | Playwright                                 |
| `npm run db:start` / `db:stop`      | Supabase local                             |
| `npm run db:reset`                  | recria o banco local (migrations + seed)   |
| `npm run db:diff`                   | gera migration a partir de mudanças locais |
| `npm run db:types`                  | regenera `src/types/database.ts`           |

## Specification-Driven Development

Nenhuma feature começa por código. Fluxo (SDD §29):

```
PROBLEMA → REQUISITO → USER STORY → CRITÉRIOS DE ACEITAÇÃO → CASOS DE TESTE
→ DESIGN TÉCNICO → TASKS → IMPLEMENTAÇÃO → VALIDAÇÃO
```

Antes de abrir a branch, a feature precisa de `specs/<feature>/SPEC.md`,
`ACCEPTANCE.md` e `TESTS.md` preenchidos e revisados (Definition of Ready —
SDD §36). Ver [`specs/README.md`](./specs/README.md).

## Git workflow

```
main            produção (release)
 ↑
develop         integração — base dos PRs
 ↑
feature/*  fix/*  refactor/*  test/*  chore/*  docs/*
```

- **Branch a partir de `develop`.** PR sempre para `develop`.
- `main` recebe só merges de `develop` em release.
- Nome da branch: `feature/net-invites`, `fix/offer-cross-org`, etc.

## Commits — Conventional Commits (em inglês)

```
feat:      nova funcionalidade
fix:       correção
refactor:  refatoração sem mudança de comportamento
test:      testes
docs:      documentação
chore:     manutenção / infra
style:     formatação, sem mudança de código
perf:      performance
```

Exemplos:

```
feat(network): add reseller invitation acceptance flow
fix(offers): prevent cross-organization offer access
test(sales): cover stock rollback on failed sale confirmation
```

Escopo entre parênteses = nome da feature (`auth`, `network`, `catalog`,
`inventory`, `customers`, `sales`, `offers`, `negotiations`, `dashboard`, `ui`).

Commits assinados apenas pelo autor humano.

## Pull Request

Todo PR preenche (SDD §42):

```
Spec:
Requirement:
User Story:
Acceptance Criteria:
Tests:
Security impact:
Database impact:
```

Checklist:

- [ ] SPEC implementada e critérios de aceitação atendidos
- [ ] testes previstos no `TESTS.md` aprovados
- [ ] `npm run typecheck` e `npm run lint` limpos
- [ ] RLS revisada (2 tenants) quando toca dados
- [ ] sem secrets; sem chave `NEXT_PUBLIC_` nova indevida
- [ ] migration revisada; `database.ts` regenerado
- [ ] documentação e `IMPLEMENTATION_PLAN.md` atualizados
- [ ] rastreabilidade: todo `RF-*` da feature em pelo menos um `TC-*`

## Estilo de código

- TypeScript estrito; evitar `any` (usar `unknown` + narrowing ou tipos gerados).
- Componentes: arquivo `kebab-case.tsx`, export nomeado `PascalCase`.
- Imports absolutos `@/…`.
- Sem `console.log` (lint bloqueia; `warn`/`error` permitidos).
- Formatação via Prettier — não discutir em review, o hook resolve.
