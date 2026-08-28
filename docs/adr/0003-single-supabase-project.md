# ADR-0003 — Projeto Supabase único

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** RNF-SEC-002, RNF-SEC-003

## Contexto

Decisão do time (2026-08-28): usar **um único projeto Supabase** para o MVP, em
vez de projetos separados por ambiente.

## Decisão

- Um projeto Supabase hospedado + um ambiente local (`supabase start`) para
  desenvolvimento e testes de integração.
- Isolamento entre organizações é **lógico**, garantido por RLS (RNF-SEC-002/003),
  não por projetos separados.
- Migrations versionadas em `supabase/migrations/`; o ambiente local é a réplica
  fiel do schema de produção.
- Deploy de schema para produção via `supabase db push` em pipeline controlado.

## Consequências

- Sem custo/complexidade de múltiplos projetos no MVP.
- **Risco:** uma migration ruim afeta produção diretamente. Mitigação: toda
  migration passa por PR + review + teste no ambiente local + janela de deploy.
- Dados de teste **nunca** vão para o projeto hospedado; seeds só no local
  (`supabase/seed.sql`).
- Backups automáticos do Supabase habilitados antes do piloto (Sprint 7).
- Pós-MVP: reavaliar staging dedicado quando houver dados reais de fábrica.

## Alternativas consideradas

- **Projetos dev/staging/prod separados:** mais seguro para o schema, porém
  overhead operacional que o time optou por adiar.
