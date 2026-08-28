# Plano de Implementação

Deriva das 7 sprints do SDD §39, detalhado em features com dependências técnicas.
Status: **atualizar a cada PR**.

## Legenda de status

`⬜ não iniciado` · `🟨 em andamento` · `✅ concluído`

## Fase 0 — Fundação técnica

| Item | Status |
| --- | --- |
| Scaffold Next.js 16 + TS estrito + Tailwind (tokens do design) | ✅ |
| Tooling: ESLint, Prettier, Husky + lint-staged, EditorConfig | ✅ |
| Testes: Vitest + Testing Library + Playwright | ✅ |
| Supabase CLI + `config.toml` + clients (browser/server/admin) | ✅ |
| Validação de env (Zod, fail-fast) | ✅ |
| Proxy de sessão + guarda de rota | ✅ |
| Estrutura de pastas do SDD (`features/`, `components/`, `lib/`, `specs/`) | ✅ |
| Documentação: ARCHITECTURE, DATA_MODEL, SECURITY, TESTING, ADRs | ✅ |
| CI GitHub Actions (lint → typecheck → test → e2e) | ⬜ |
| Configurar provedores OAuth (Google, Apple) no Supabase | ⬜ |
| `develop` protegida no GitHub | ⬜ |
| Ambiente local Supabase (portas 544xx) + migrations 0001–0009 aplicadas | ✅ |
| Seed de desenvolvimento (`scripts/seed.mjs`) | ✅ |
| 70 testes unit/integration + 5 E2E verdes; `build`/`lint`/`typecheck` limpos | ✅ |

## Fase 1 — Modelo de dados & RLS

| Item | Ref | Status |
| --- | --- | --- |
| Migration `0001` enums + `profiles` + trigger `on_auth_user_created` | §23 | ⬜ |
| Funções auxiliares RLS (`auth_org_ids`, `is_org_member`, `has_org_role`, `shares_network`) | SECURITY | ⬜ |
| Trigger `set_updated_at` | — | ⬜ |
| `supabase/seed.sql` (fábrica demo, 2 revendedoras, rede) | — | ⬜ |
| Suíte de testes de RLS com 2 tenants | RNF-SEC-002 | ⬜ |

As demais migrations acompanham cada feature.

## Fase 2 — Design System

| Item | Status |
| --- | --- |
| Tokens no `tailwind.config.ts` + `globals.css` | ✅ |
| Atoms: Button, TextField, Checkbox, Icon, Badge, Spinner, Logo | ✅ |
| Atoms restantes: Avatar, IconButton, Label, Toggle | ⬜ |
| Molecules: SearchInput, PriceField, MoneyInput, StockBadge, FormField, SegmentedControl, EmptyState | ⬜ |
| Organisms: TopAppBar, BottomNav | 🟨 |
| Organisms: SidebarNav (desktop), ProductForm, InventoryTable, OfferCard, NegotiationPanel, SalesTable | ⬜ |
| Templates: AppShell | 🟨 |
| Templates: AuthTemplate, ManagementTemplate, MarketplaceTemplate | ⬜ |

## Fase 3 — Features (ordem e dependências)

| # | Feature | Sprint | RF | Telas | Depende de | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **auth** | 1 | RF-AUTH-001..004 | login | Fase 0 | ✅ |
| 2 | **organizations** | 1 | base RF-NET, RF-AUTH-004 | — | auth | ✅ |
| 3 | **network** | 1 / 6 | RF-NET-001..008 | rede conectada 1·2, perfil da revendedora | organizations | 🟨 back-end + telas base; falta email de convite real, perfil público |
| 4 | **catalog** | 2 | RF-PROD-001..006 | novo produto, detalhes do produto, inventário | organizations | 🟨 CRUD funcional; falta upload de imagens, categorias UI, archive UI |
| 5 | **inventory** | 3 | RF-INV-001..006 | inventário, detalhes do produto | catalog | ✅ RPCs + controles; histórico de movimentações pendente na UI |
| 6 | **customers** | 3 | RF-CUSTOMER-001..004 | clientes, detalhes do cliente | organizations | 🟨 CRUD + histórico; falta editar/arquivar na UI |
| 7 | **sales** | 3 | RF-SALE-001..009 | registrar venda, vendas | inventory, customers | ✅ confirmar/cancelar transacional + telas |
| 8 | **offers** | 4 | RF-OFFER-001..007 | detalhes da oferta, rede | inventory, network | ✅ publicar/cancelar + feed + detalhe |
| 9 | **negotiations** | 5 | RF-NEG-001..009 | negociações, chat de negociação | offers | ✅ proposta→aceite→conclusão transacional + timeline |
| 10 | **dashboard (revendedora)** | 3→6 | RF-DASH-001 | dashboard | sales, inventory, offers, negotiations | 🟨 KPIs principais; falta "mais vendidos", highlights da rede |
| 11 | **dashboard (fábrica)** | 6 | RF-FACTORY-DASH-001 | (nova) | network, offers, negotiations | 🟨 `/rede-fabrica` com indicadores agregados; falta view `security_barrier` dedicada |

Cada feature: `SPEC → ACCEPTANCE → TESTS` (em `specs/<feature>/`) → migration + RLS
→ `queries.ts`/`actions.ts` → componentes → composição da página → testes → PR
(checklist SDD §42).

## Fase 4 — Estabilização (Sprint 7)

| Item | Ref |
| --- | --- |
| E2E do fluxo principal completo | SDD §35 |
| Auditoria de RLS + segurança | SECURITY §Auditoria |
| Responsividade em smartphone | RNF-USA-001/002 |
| Acessibilidade WCAG 2.1 AA nos fluxos principais | RNF-ACC-001 |
| Performance < 2s nas páginas principais | RNF-PERF-001/002 |
| Matriz de rastreabilidade 100% (RF → US → AC → TC) | SDD §32/§38 |
| Teste com fábrica + revendedoras | SDD §39 Sprint 7 |
| Release `v1.0.0` | — |

## Decisões travadas (2026-08-28)

| Tema | Decisão | ADR |
| --- | --- | --- |
| Login social | Habilitado (Google, Apple) + onboarding por convite | 0002 |
| Gerenciador de pacotes | npm | — |
| Supabase | Projeto único | 0003 |
| Branching | `develop` primeiro, depois `main` | CONTRIBUTING |
| Moeda | Real (BRL), sem multi-moeda | 0008 |
