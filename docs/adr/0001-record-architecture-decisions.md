# ADR-0001 — Registrar decisões de arquitetura

- **Status:** Aceito
- **Data:** 2026-08-28

## Contexto

O Vestiq segue Specification-Driven Development (SDD §29). Decisões técnicas
transversais (que não pertencem a uma única SPEC) precisam de um registro
rastreável, com contexto e consequências, para não se perderem em threads de PR.

## Decisão

Usar **Architecture Decision Records** em `docs/adr/`, numerados
sequencialmente (`NNNN-titulo-kebab.md`), no formato: Contexto → Decisão →
Consequências → Alternativas consideradas.

Um ADR é imutável após "Aceito"; mudança de rumo cria um novo ADR que
referencia e supera (`Substitui: ADR-XXXX`) o anterior.

## Consequências

- SPECs referenciam ADRs em "Requisitos Relacionados" quando aplicável.
- O template de SPEC (SDD §31) ganha, quando necessário, um `ADR.md` local à
  feature para decisões restritas àquele domínio; decisões globais ficam aqui.

## Alternativas consideradas

- **Só descrição de PR:** não sobrevive a squash/merge nem é pesquisável.
- **Wiki:** sai do controle de versão e diverge do código.
