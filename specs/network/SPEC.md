# SPEC-003 — Rede da Fábrica (Conectar)

- **Status:** Rascunho
- **Sprint:** 1 (criação/convite/aceite) · 6 (gestão pela fábrica)
- **Requisitos SDD:** RF-NET-001..008; SDD §3 (pilar CONECTAR), §26
- **Telas:** `vestiq_rede_conectada_1`, `vestiq_rede_conectada_2`, `vestiq_perfil_da_revendedora`
- **ADRs:** [0002](../../docs/adr/0002-invite-and-social-auth.md)

## Problema

A fábrica precisa de uma rede privada de revendedoras vinculadas, com convite,
aceite e controle de acesso — sem que uma revendedora enxergue redes/dados de
outra.

## Objetivo

Permitir: cadastrar fábrica; criar rede vinculada; convidar revendedoras;
revendedora aceitar; registrar o vínculo; a fábrica ver e desativar membros;
impedir acesso a redes não pertencentes.

## Escopo

- `factory_networks`, `network_members` + policies.
- Convite por email com token (RF-NET-003), aceite consumindo o token (RF-NET-004).
- Listagem de membros da rede para `FACTORY_ADMIN` (RF-NET-006).
- Desativação de acesso de uma revendedora (RF-NET-007).
- Tela de diretório da rede para revendedoras (peers) e perfil público da revendedora.

## Fora do Escopo

- Múltiplas redes por fábrica/região (pós-MVP).
- Reputação/avaliações reais (mock na tela por ora).
- Mensageria entre revendedoras fora de uma negociação.

## Atores

`FACTORY_ADMIN` (cria rede, convida, gere), `RESELLER` (aceita, navega a rede),
`PLATFORM_ADMIN` (cria a fábrica).

## Requisitos Relacionados

| RF         | Descrição                              |
| ---------- | -------------------------------------- |
| RF-NET-001 | Cadastrar uma fábrica                  |
| RF-NET-002 | Criar rede vinculada à fábrica         |
| RF-NET-003 | Fábrica convida revendedoras           |
| RF-NET-004 | Revendedora aceita convite             |
| RF-NET-005 | Registrar vínculo revendedora↔fábrica  |
| RF-NET-006 | Fábrica vê membros da rede             |
| RF-NET-007 | Fábrica desativa acesso de revendedora |
| RF-NET-008 | Revendedoras não acessam redes alheias |

## User Stories

| ID        | Como…         | Quero…                                   | Para…                             |
| --------- | ------------- | ---------------------------------------- | --------------------------------- |
| US-NET-01 | FACTORY_ADMIN | criar a rede da minha fábrica            | organizar minhas revendedoras     |
| US-NET-02 | FACTORY_ADMIN | convidar uma revendedora por email       | trazê-la para a rede              |
| US-NET-03 | RESELLER      | aceitar um convite                       | passar a fazer parte da rede      |
| US-NET-04 | FACTORY_ADMIN | ver a lista de revendedoras e seu status | acompanhar a adesão               |
| US-NET-05 | FACTORY_ADMIN | desativar uma revendedora                | remover acesso de quem saiu       |
| US-NET-06 | RESELLER      | navegar o diretório da minha rede        | descobrir parceiros para negociar |

## Regras de Negócio

| ID        | Regra                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-NET-01 | Só `type = FACTORY` pode ser `factory_id` de uma rede                                                                                            |
| BR-NET-02 | Convite tem `invited_email` + `invite_token` único; expira em 14 dias                                                                            |
| BR-NET-03 | Aceite exige usuário autenticado cujo email confere com `invited_email` (ou fluxo de vínculo explícito)                                          |
| BR-NET-04 | Aceite cria/ativa `network_members` (`status = ACTIVE`, `joined_at = now()`) e o `organization_members` da revendedora                           |
| BR-NET-05 | Uma revendedora não pode ter dois vínculos ativos com a mesma rede                                                                               |
| BR-NET-06 | `FACTORY_ADMIN` só vê/gere a própria rede                                                                                                        |
| BR-NET-07 | Desativar (`status = DISABLED`) remove a revendedora do diretório e revoga acesso a ofertas/negociações da rede — dados próprios dela permanecem |
| BR-NET-08 | `RESELLER` enxerga apenas redes em que tem `network_members` ativo (RF-NET-008)                                                                  |
| BR-NET-09 | Reconvite de revendedora desativada reativa o vínculo, não duplica                                                                               |

## Fluxos

**Criar rede:** FACTORY_ADMIN → nome da rede → `factory_networks` criada.

**Convidar:** FACTORY_ADMIN informa email → `network_members` `status = INVITED` +
token → email com link `/convite/[token]`.

**Aceitar:** revendedora abre o link autenticada → valida token/expiração/email →
cria org RESELLER (se novo) + `organization_members` + ativa `network_members`.

**Desativar:** FACTORY_ADMIN → `status = DISABLED` na revendedora.

## Estados

`network_members`: `INVITED → ACTIVE → DISABLED` (→ `ACTIVE` via reconvite).

## Segurança

- `factory_networks`: `select/all` só para membros da fábrica dona.
- `network_members`: fábrica dona (todos) + a própria revendedora (sua linha).
- Diretório de peers: revendedora vê organizações `RESELLER` com vínculo ativo na
  **mesma** rede; **não** vê dados operacionais delas (SDD §8).
- Token de convite: aleatório (uuid), consumido uma vez, não enumerável.

## Casos de Erro

| Situação                           | Resposta                          |
| ---------------------------------- | --------------------------------- |
| Token inválido/expirado            | "Convite inválido ou expirado"    |
| Email do usuário ≠ convite         | "Este convite é para outro email" |
| Revendedora já ativa na rede       | idempotente — segue para a rede   |
| FACTORY_ADMIN acessando outra rede | 404 / RLS vazio                   |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [ ] Migrations `factory_networks`, `network_members` + policies
- [ ] Actions: `createNetwork`, `inviteReseller`, `acceptInvite`, `disableMember`, `reinvite`
- [ ] Envio de email de convite (Supabase / provider)
- [ ] Página `/convite/[token]`
- [ ] Tela diretório da rede (revendedora) + perfil público da revendedora
- [ ] Tela de membros da rede (fábrica)
- [ ] Testes de RLS (rede A × rede B) + expiração de token
