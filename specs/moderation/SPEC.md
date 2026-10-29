# SPEC-017 — Denúncias e moderação

- **Status:** Implementada
- **Sprint:** 6
- **Requisitos SDD:** RF-MOD-001..004 (novos — segurança da rede)
- **Jira:** VES-43 (HU15) + subtarefa VES-48, VES-44 (HU16); VES-34 e VES-35 são duplicados
- **Telas:** link "Denunciar" na oferta, na negociação e no perfil público; `/denunciar`; `/moderacao`; `/moderacao/denuncias/[id]`; `/conta-suspensa`
- **ADRs relacionados:** [0004](../../docs/adr/0004-atomic-operations-via-postgres-functions.md)
- **Depende de:** [SPEC-003 Rede](../network/SPEC.md) (perfil público), [SPEC-008 Ofertas](../offers/SPEC.md), [SPEC-009 Negociações](../negotiations/SPEC.md)

## Problema

A rede é fechada, mas nada impede uma oferta de réplica, uma conversa abusiva ou
uma loja que aplica golpes. O papel `PLATFORM_ADMIN` e o status `SUSPENDED` já
existiam no banco, sem tela nem efeito.

## Objetivo

- Qualquer revendedora denuncia uma oferta, a conversa de uma negociação ou uma
  revendedora da rede, com motivo.
- O administrador da plataforma revisa a fila e decide: arquivar, remover a
  oferta ou suspender a loja — sempre com motivo registrado.
- Loja suspensa não entra e sabe por quê.

## Escopo

- Denúncia: motivo de uma lista + descrição opcional; confirmação por toast.
- Fila de moderação filtrável por status (abertas, resolvidas, arquivadas, todas).
- Detalhe da denúncia com o alvo, quem denunciou, o relato e o total de denúncias
  abertas contra a loja.
- Ações: arquivar denúncia, remover oferta, suspender loja; reativar loja suspensa.
- Histórico append-only das decisões (`moderation_actions`).
- Bloqueio da loja suspensa no banco (RLS), no login e nas sessões abertas.

## Fora do Escopo

- Notificar quem denunciou ou a loja denunciada por e-mail/sino.
- Suspender um único usuário dentro de uma loja com vários membros (a suspensão
  é da organização; no MVP cada revendedora tem uma conta).
- Recurso pela plataforma (o texto orienta a falar com o suporte).
- Tela para criar o `PLATFORM_ADMIN` (é feito por SQL — `docs/DEPLOY.md`).

## Requisitos

| ID         | Requisito                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| RF-MOD-001 | Revendedora denuncia oferta, conversa de negociação ou revendedora da rede, com motivo obrigatório e descrição opcional |
| RF-MOD-002 | `PLATFORM_ADMIN` vê a fila de denúncias, filtrável por status                                                           |
| RF-MOD-003 | `PLATFORM_ADMIN` arquiva a denúncia, remove a oferta ou suspende/reativa a loja, com motivo registrado                  |
| RF-MOD-004 | Loja suspensa não consegue entrar e vê a explicação                                                                     |

## User Stories

| ID        | Como…          | Quero…                                                 | Para…                             |
| --------- | -------------- | ------------------------------------------------------ | --------------------------------- |
| US-MOD-01 | participante   | denunciar uma oferta, mensagem ou usuário inadequado   | manter a rede segura              |
| US-MOD-02 | PLATFORM_ADMIN | revisar denúncias e suspender lojas ou remover ofertas | manter a qualidade do ecossistema |

## Regras de Negócio

| ID        | Regra                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-REP-01 | Oferta: só quem a vê no feed (membro ativo da rede, oferta ativa). Negociação: só uma das partes (denuncia a outra). Revendedora: só quem compartilha rede ativa          |
| BR-REP-02 | Ninguém denuncia a própria loja                                                                                                                                           |
| BR-REP-03 | Motivo obrigatório: spam, fraude, produto falsificado, conteúdo inadequado, assédio ou outro; descrição até 1000 caracteres                                               |
| BR-REP-04 | Uma denúncia **aberta** por denunciante e alvo; depois de resolvida, pode denunciar de novo                                                                               |
| BR-REP-05 | Quem denuncia vê só as próprias denúncias — nunca quem mais denunciou; a loja denunciada não vê nada                                                                      |
| BR-MOD-01 | Painel, funções e leitura das denúncias restritos a `PLATFORM_ADMIN` de organização `PLATFORM` ativa (página 404 e RLS)                                                   |
| BR-MOD-02 | Só denúncia `OPEN` recebe decisão; remover oferta só em denúncia de oferta; a plataforma não se suspende                                                                  |
| BR-MOD-03 | Toda decisão exige motivo e fica em `moderation_actions` (ação, denúncia, loja, oferta, motivo, autor)                                                                    |
| BR-MOD-04 | Remover a oferta cancela-a e resolve todas as denúncias abertas dela; suspender resolve todas as denúncias abertas contra a loja                                          |
| BR-MOD-05 | Loja suspensa: os helpers de RLS deixam de contar o vínculo (sem leitura nem escrita), ofertas e perfil somem da rede, login recusado com o motivo; reativar devolve tudo |

## Fluxos

**Denunciar:** "Denunciar" → `/denunciar?alvo=oferta|negociacao|revendedora&id=…`
→ motivo + descrição → `submit_report` → volta ao alvo com "Denúncia enviada".

**Moderar:** `admin` entra → `/moderacao` (abertas) → denúncia → motivo da decisão →
Arquivar | Remover oferta | Suspender loja (as duas últimas pedem confirmação) →
`moderate_report`.

**Reativar:** `/moderacao` → "Lojas suspensas" → motivo → Reativar →
`set_organization_suspension`.

## Estados

`reports.status`: `OPEN → DISMISSED` (arquivada) | `OPEN → ACTIONED` (oferta removida ou loja suspensa).
`organizations.status`: `ACTIVE ⇄ SUSPENDED`.

## Segurança

- `reports`: SELECT para membros da loja denunciante e `PLATFORM_ADMIN`; sem policy
  de escrita — só `submit_report` (valida a visibilidade do alvo e deriva a loja
  denunciada) e `moderate_report`.
- `moderation_actions`: SELECT só `PLATFORM_ADMIN`; append-only.
- `organizations_select_platform_admin`: o admin lê os nomes das lojas envolvidas.
- `list_moderation_reports`, `moderate_report`, `set_organization_suspension`
  checam `is_platform_admin()` (SECURITY DEFINER).
- Suspensão aplicada em `auth_org_ids`/`is_org_member`/`has_org_role` (migration 0047).
- Risco residual: `open_negotiation` ainda aceita proposta numa oferta de loja
  suspensa por chamada direta à API (a oferta não aparece em nenhuma tela, e a loja
  suspensa não consegue aceitar).

## Casos de Erro

| Situação                                     | Resposta                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Denúncia repetida em aberto                  | "Você já denunciou isto. A moderação vai analisar."                                                |
| Denunciar a própria loja                     | "Você não pode denunciar a sua própria loja"                                                       |
| Alvo que não vê                              | "Você não tem permissão para esta ação" / página 404                                               |
| Sem motivo                                   | "Escolha o motivo da denúncia"                                                                     |
| Decisão sem motivo                           | "Informe o motivo da decisão"                                                                      |
| Denúncia já resolvida                        | "Esta denúncia já foi resolvida"                                                                   |
| Reativar loja ativa / suspender a plataforma | "Organização não encontrada ou já neste estado"                                                    |
| Login de loja suspensa                       | "A conta de X está suspensa pela moderação do Vestiq. Motivo: … Fale com o suporte para recorrer." |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).
