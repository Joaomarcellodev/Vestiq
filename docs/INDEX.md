# Documentação Vestiq

Índice da documentação técnica do projeto. A visão de produto e os requisitos
funcionais canônicos vivem em **`README.md — Vestiq MVP - SDD.md`** (o SDD).

## Referência técnica

| Documento | Conteúdo |
| --- | --- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Estrutura de pastas, camadas, App Router, Server Actions, fluxo de dados |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Entidades, relacionamentos, enums, movimentações de estoque, migrations |
| [`SECURITY.md`](./SECURITY.md) | Autenticação, RLS, multi-tenancy, segredos, checklist de PR |
| [`TESTING.md`](./TESTING.md) | Estratégia de testes, ferramentas, cobertura, regras críticas |
| [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) | Roadmap de implementação por sprint/feature e dependências |
| [`adr/`](./adr/) | Architecture Decision Records |

## Especificações (SDD)

Cada feature do MVP tem sua pasta em [`../specs/`](../specs/) com `SPEC.md`,
`ACCEPTANCE.md` e `TESTS.md`. Ver [`../specs/README.md`](../specs/README.md) para
o processo e a matriz de rastreabilidade.

## Design

`design/` contém, por tela: `screen.png` (referência visual) e `code.html`
(protótipo Tailwind). O design system está em `design/vestiq_core/DESIGN.md` e
foi portado para [`../tailwind.config.ts`](../tailwind.config.ts).

> Duas capturas estão corrompidas no export original (`vestiq_vendas/screen.png`,
> `vestiq_rede_conectada_1/screen.png`); usar o `code.html` correspondente como
> referência até um novo export.
