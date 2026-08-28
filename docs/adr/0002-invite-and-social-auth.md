# ADR-0002 — Onboarding por convite + login social

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** RF-AUTH-001, RF-NET-003, RF-NET-004, SDD §7

## Contexto

O design de login (`docs/design/vestiq_login`) mostra email/senha, "Lembrar-me",
"Esqueci minha senha", login com Google e Apple, e "Criar conta". Ao mesmo tempo,
o SDD define a rede como privada: `PLATFORM_ADMIN` cria fábricas e
`FACTORY_ADMIN` convida revendedoras (RF-NET-003/004). Não há auto-registro
público de organização no MVP.

## Decisão

1. **Autenticação (quem você é):** email/senha **e** OAuth Google/Apple, via
   Supabase Auth. Ambos habilitados na tela de login.
2. **Autorização/onboarding (a que você pertence):** sempre por **convite**. Um
   usuário pode se autenticar (inclusive criar credencial), mas só ganha acesso a
   dados ao aceitar um convite que o vincula a uma `organization` /
   `factory_network`.
3. A tela de login **não** expõe "Criar conta" como fluxo de auto-cadastro de
   organização no MVP. O link de cadastro, quando presente, leva ao aceite de
   convite (`/convite/[token]`).
4. "Esqueci minha senha" usa o fluxo de recuperação do Supabase.

## Consequências

- `signInWithOAuth` redireciona para `/auth/callback` (PKCE) que troca o código
  pela sessão e segue para `next` (interno).
- Primeiro login sem convite pendente → tela "aguardando convite" (sem acesso a
  dados; RLS já garante isso).
- O aceite de convite (Sprint 1, feature `network`) associa `auth.uid()` ao
  `organization_members` / `network_members` correspondente.
- Provedores OAuth precisam de configuração no painel Supabase (client id/secret,
  `redirect_uri`); documentado no README de dev.

## Alternativas consideradas

- **Invite-only sem social:** mais simples, mas contraria o design aprovado e
  atrita o onboarding das revendedoras.
- **Auto-registro de organização:** fora do escopo do MVP (SDD §6) e quebra o
  modelo B2B2B patrocinado pela fábrica.
