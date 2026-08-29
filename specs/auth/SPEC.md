# SPEC-001 — Autenticação e Controle de Acesso

- **Status:** Em implementação
- **Sprint:** 1 (Identity & Network)
- **Requisitos SDD:** RF-AUTH-001, RF-AUTH-002, RF-AUTH-003, RF-AUTH-004
- **Telas:** `docs/design/vestiq_login`
- **ADRs:** [0002](../../docs/adr/0002-invite-and-social-auth.md),
  [0009](../../docs/adr/0009-nextjs-16-app-router.md)

## Contexto

Toda a operação do Vestiq (gestão da revendedora, rede da fábrica, negociações) é
privada e isolada por organização. A porta de entrada é a autenticação; a
autorização por papel e a RLS fazem o resto.

## Problema

Sem autenticação e proteção de rotas, qualquer pessoa acessaria dados
operacionais e comerciais de revendedoras e fábricas.

## Objetivo

Permitir que um usuário se autentique (email/senha ou provedor social), encerre a
sessão, e garantir que rotas privadas exijam sessão válida e o papel adequado.

## Escopo

- Login com email/senha.
- Login social: Google (Supabase OAuth, fluxo PKCE via `/auth/callback`).
- "Lembrar-me" e "Esqueci minha senha" (recuperação via Supabase).
- Logout.
- Proxy que renova a sessão e bloqueia rotas privadas.
- Verificação de papel (`PLATFORM_ADMIN`, `FACTORY_ADMIN`, `RESELLER`) nas
  Server Actions/Queries e via RLS.
- Estado "autenticado sem organização" (aguardando convite).

## Fora do Escopo

- Auto-cadastro de organização (ADR-0002). O aceite de convite é da feature
  `network`.
- MFA, SSO corporativo, gestão de sessões ativas — pós-MVP.
- Tela de perfil/senha do usuário (feature `perfil`).

## Atores

| Ator                    | Interesse                |
| ----------------------- | ------------------------ |
| Usuário não autenticado | acessar a plataforma     |
| RESELLER                | operar seu negócio       |
| FACTORY_ADMIN           | gerir sua rede           |
| PLATFORM_ADMIN          | administrar a plataforma |

## Requisitos Relacionados

| RF          | Descrição                                                               |
| ----------- | ----------------------------------------------------------------------- |
| RF-AUTH-001 | O sistema deve permitir autenticação de usuários                        |
| RF-AUTH-002 | O sistema deve permitir encerramento da sessão                          |
| RF-AUTH-003 | O sistema deve proteger rotas privadas contra usuários não autenticados |
| RF-AUTH-004 | O sistema deve controlar acesso conforme o papel do usuário             |

## User Stories

| ID         | Como…                   | Quero…                                        | Para…                                            |
| ---------- | ----------------------- | --------------------------------------------- | ------------------------------------------------ |
| US-AUTH-01 | usuário                 | entrar com email e senha                      | acessar minha conta                              |
| US-AUTH-02 | usuário                 | entrar com Google                             | não gerenciar outra senha                        |
| US-AUTH-03 | usuário autenticado     | sair da conta                                 | proteger meu acesso em dispositivo compartilhado |
| US-AUTH-04 | usuário não autenticado | ser levado ao login ao abrir uma rota privada | entender que preciso entrar                      |
| US-AUTH-05 | sistema                 | negar ação fora do papel do usuário           | manter a separação de responsabilidades          |
| US-AUTH-06 | usuário sem vínculo     | ver que estou aguardando um convite           | saber o próximo passo                            |

## Regras de Negócio

| ID         | Regra                                                                                                                           | Origem                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| BR-AUTH-01 | Credenciais inválidas retornam mensagem genérica ("Email ou senha incorretos"), sem revelar qual campo falhou                   | segurança                 |
| BR-AUTH-02 | Após login bem-sucedido, redirecionar para `next` (se caminho interno) ou `/dashboard`                                          | UX                        |
| BR-AUTH-03 | Usuário já autenticado que acessa `/login` é redirecionado para `/dashboard`                                                    | UX                        |
| BR-AUTH-04 | Parâmetro `next` só é aceito se começar com `/` e não com `//`                                                                  | segurança (open redirect) |
| BR-AUTH-05 | Rota privada sem sessão → redirect `/login?next=<rota>`                                                                         | RF-AUTH-003               |
| BR-AUTH-06 | Papel do usuário vem de `organization_members.role` na organização ativa; sem membership ativo, acesso a dados é negado por RLS | RF-AUTH-004               |
| BR-AUTH-07 | Logout limpa a sessão do Supabase e os cookies, e redireciona para `/login`                                                     | RF-AUTH-002               |
| BR-AUTH-08 | Falha no callback OAuth → `/login?error=oauth` com aviso                                                                        | UX                        |

## Fluxo Principal — login com senha

1. Usuário acessa `/login`.
2. Preenche email e senha, envia.
3. Server Action valida o formato (Zod).
4. `supabase.auth.signInWithPassword`.
5. Sucesso → cookies de sessão gravados → redirect para `next`/`/dashboard`.

## Fluxos Alternativos

- **A1 — social:** clica em Google → Server Action `signInWithOAuth` →
  redirect ao provedor → volta em `/auth/callback?code=…&next=…` → troca do código
  → redirect para `next`.
- **A2 — credencial inválida:** passo 4 falha → formulário exibe BR-AUTH-01,
  campos preservados (exceto senha).
- **A3 — validação de campo:** email vazio/ inválido ou senha vazia → mensagens
  por campo, sem chamar o Supabase.
- **A4 — esqueci a senha:** link → fluxo de recuperação do Supabase (envio de
  email). (Implementação detalhada: feature `perfil`, mas o link existe aqui.)
- **A5 — sem organização:** login ok, porém sem `organization_members` ativo →
  tela "aguardando convite".

## Estados

```
não autenticado ──login──▶ autenticado sem org ──aceite de convite──▶ autenticado com org
       ▲                                                                    │
       └───────────────────────── logout ───────────────────────────────────┘
```

## Modelo de Dados

- `auth.users` (Supabase) + `profiles` (espelho, via trigger).
- `organization_members (user_id, organization_id, role, status)` — origem do papel.
- Sem tabela nova nesta SPEC além de `profiles` e do trigger.

## Segurança

- Sessão em cookies HttpOnly geridos por `@supabase/ssr`.
- `src/proxy.ts` (matcher cobre tudo exceto assets/estáticos) renova a sessão e
  aplica BR-AUTH-05 / BR-AUTH-03.
- `features/auth/queries.ts`: `getCurrentUser()`, `requireUser()`. A ser
  adicionado: `requireRole()`, `requireOrgRole()`.
- Nenhuma rota privada confia apenas no proxy — o `layout.tsx` de `(app)` também
  chama `requireUser()`.
- `next` sanitizado (BR-AUTH-04) tanto na Server Action quanto no callback.

## Casos de Erro

| Situação                           | Resposta                                  |
| ---------------------------------- | ----------------------------------------- |
| Email/senha inválidos              | "Email ou senha incorretos." (genérica)   |
| Email malformado                   | "Email inválido." (campo)                 |
| Senha vazia                        | "Informe sua senha." (campo)              |
| Provedor OAuth recusa/erro         | redirect `/login?error=oauth` + alerta    |
| `next` externo (`https://mal.com`) | ignorado, usa `/dashboard`                |
| Sessão expirada em rota privada    | proxy redireciona para `/login?next=…`    |
| Env do Supabase ausente            | app não sobe (`lib/env.ts` falha no boot) |

## Testes Esperados

Ver [`TESTS.md`](./TESTS.md).

## Tasks

- [x] Clients Supabase (browser/server/admin) + proxy de sessão
- [x] Schema Zod de credenciais + provedores OAuth
- [x] Server Actions `signInWithPassword`, `signInWithOAuth`, `signOut`
- [x] Route Handler `/auth/callback`
- [x] Tela `/login` (mobile + desktop) conforme design
- [x] Grupo `(app)` protegido + placeholder de dashboard
- [ ] Migration `profiles` + trigger `on_auth_user_created`
- [ ] `requireRole()` / `requireOrgRole()` + testes
- [ ] Tela "aguardando convite"
- [x] Link "Esqueci minha senha" → fluxo de recuperação (`/recuperar-senha` + `/redefinir-senha`)
- [ ] E2E: login, logout, guarda de rota, open-redirect
