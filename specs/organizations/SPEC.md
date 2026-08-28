# SPEC-002 — Organizações e Membros

- **Status:** Rascunho
- **Sprint:** 1
- **Requisitos SDD:** base para RF-NET-*, RF-AUTH-004; SDD §24, §25, §28
- **ADRs:** [0003](../../docs/adr/0003-single-supabase-project.md)

## Contexto

Vestiq é multi-organização (FACTORY, RESELLER, PLATFORM). Toda tabela de domínio
referencia a organização proprietária, e a RLS isola os dados. Esta feature
estabelece organizações, membros, papéis e o conceito de "organização ativa" na
sessão.

## Problema

Sem a camada de organização/membership não há tenant para isolar dados nem papel
para autorizar ações.

## Objetivo

- Modelar `organizations` e `organization_members`.
- Fornecer o contexto de organização ativa às Server Components/Actions.
- Fornecer helpers de autorização por papel/organização.
- Base das funções RLS (`auth_org_ids`, `is_org_member`, `has_org_role`).

## Escopo

- Migration de `organizations`, `organization_members`, enums e funções RLS.
- `getActiveOrganization()`, `listMyOrganizations()`, `requireOrgRole()`.
- Troca de organização ativa quando o usuário pertence a mais de uma (raro no MVP).
- Criação de organização FACTORY e PLATFORM por `PLATFORM_ADMIN` (mínimo para seed
  e operação interna).

## Fora do Escopo

- Convite de revendedora e vínculo com rede → feature `network`.
- Auto-cadastro de organização (ADR-0002).
- Faturamento/assinatura da fábrica (SDD §4 — não faz parte do MVP).

## Atores

`PLATFORM_ADMIN`, `FACTORY_ADMIN`, `RESELLER`.

## Requisitos Relacionados

| RF          | Descrição                                                   |
| ----------- | ----------------------------------------------------------- |
| RF-AUTH-004 | Controlar acesso conforme papel                             |
| RF-NET-005  | Registrar vínculo revendedora↔fábrica (membership é a base) |
| RF-NET-008  | Revendedoras não acessam redes alheias (RLS por org)        |

## User Stories

| ID        | Como…                              | Quero…                                         | Para…                              |
| --------- | ---------------------------------- | ---------------------------------------------- | ---------------------------------- |
| US-ORG-01 | PLATFORM_ADMIN                     | cadastrar uma fábrica                          | iniciar o onboarding de um cliente |
| US-ORG-02 | usuário                            | ter minha organização ativa resolvida no login | ver só os meus dados               |
| US-ORG-03 | sistema                            | expor o papel do usuário na organização ativa  | autorizar ações                    |
| US-ORG-04 | usuário com múltiplas organizações | alternar a organização ativa                   | operar cada uma                    |

## Regras de Negócio

| ID        | Regra                                                                                  |
| --------- | -------------------------------------------------------------------------------------- |
| BR-ORG-01 | `organizations.type ∈ {FACTORY, RESELLER, PLATFORM}`                                   |
| BR-ORG-02 | Um usuário pode ser membro de várias organizações, mas tem uma ativa por sessão        |
| BR-ORG-03 | Papel efetivo = `organization_members.role` na organização ativa com `status = ACTIVE` |
| BR-ORG-04 | Sem membership ativo → nenhum dado de organização é legível (RLS)                      |
| BR-ORG-05 | `PLATFORM` só é criada/gerida por `PLATFORM_ADMIN`                                     |
| BR-ORG-06 | Desativar membership (`status = DISABLED`) revoga acesso imediatamente                 |

## Fluxo Principal — resolver organização ativa

1. Após autenticação, `getActiveOrganization()` lê `organization_members` do
   usuário (`status = ACTIVE`).
2. 0 → estado "aguardando convite". 1 → essa. >1 → preferência salva ou a primeira.
3. O id da organização ativa acompanha as queries (RLS já filtra pelo conjunto de
   orgs do usuário; a org ativa refina a visão da UI).

## Estados

`INVITED → ACTIVE → DISABLED` (membership).

## Modelo de Dados

`organizations`, `organization_members` (ver `docs/DATA_MODEL.md`). Funções RLS
em schema privado.

## Segurança

- Funções RLS `security definer`, `stable`, `set search_path = ''`.
- `requireOrgRole(orgId, roles[])` nas Actions; RLS no banco como rede de proteção.
- Nenhuma listagem cross-org: policies usam `is_org_member(organization_id)`.

## Casos de Erro

| Situação                                  | Resposta                                  |
| ----------------------------------------- | ----------------------------------------- |
| Usuário sem membership                    | tela "aguardando convite"                 |
| Ação com papel insuficiente               | erro "Ação não permitida para seu perfil" |
| Organização ativa inválida na preferência | cai para a primeira org válida            |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migration `organizations` + `organization_members` + enums
- [ ] Funções RLS + policies base
- [ ] `getActiveOrganization`, `listMyOrganizations`, `requireOrgRole`
- [ ] Estado "aguardando convite"
- [ ] Seed: PLATFORM + 1 FACTORY + 2 RESELLER
- [ ] Testes de RLS com 2 tenants
