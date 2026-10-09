# ADR-0002 — Onboarding por convite + login por email e senha

- **Status:** Aceito (revisado em 2026-10-08: login social removido — VES-96)
- **Data:** 2026-08-28
- **Requisitos:** RF-AUTH-001, RF-NET-003, RF-NET-004, SDD §7

## Contexto

O design de login (`docs/design/vestiq_login`) mostra email/senha, "Lembrar-me",
"Esqueci minha senha", login com Google e Apple, e "Criar conta". Ao mesmo tempo,
o SDD define a rede como privada: `PLATFORM_ADMIN` cria fábricas e
`FACTORY_ADMIN` convida revendedoras (RF-NET-003/004). Não há auto-registro
público de organização no MVP.

## Decisão

1. **Autenticação (quem você é):** apenas email e senha, via Supabase Auth.
   ~~OAuth Google/Apple~~ — removido em 2026-10-08 (ver
   [Revisão](#revisão-2026-10-08--sem-login-social)).
2. **Autorização/onboarding (a que você pertence):** sempre por **convite**. Um
   usuário pode se autenticar (inclusive criar credencial), mas só ganha acesso a
   dados ao aceitar um convite que o vincula a uma `organization` /
   `factory_network`.
3. A tela de login **não** expõe "Criar conta" como fluxo de auto-cadastro de
   organização no MVP. O link de cadastro, quando presente, leva ao aceite de
   convite (`/convite/[token]`).
4. "Esqueci minha senha" usa o fluxo de recuperação do Supabase.

## Consequências

- `/auth/callback` (PKCE) troca o código pela sessão e segue para `next`
  (interno). Hoje só o link de recuperação de senha passa por ele; o convite
  usa `/auth/confirm` com `token_hash`. Link inválido → `/login?error=link`.
- Primeiro login sem convite pendente → tela "aguardando convite" (sem acesso a
  dados; RLS já garante isso).
- O aceite de convite (Sprint 1, feature `network`) associa `auth.uid()` ao
  `organization_members` / `network_members` correspondente.

## Revisão 2026-10-08 — sem login social

O botão "Continuar com Google" aparecia na tela, mas o provedor nunca foi
habilitado no Supabase (local e produção): o clique terminava numa página crua
com `Unsupported provider: provider is not enabled`. O produto decidiu que o
login é **só por email e senha** da própria aplicação (VES-96).

- Saíram da tela o botão do Google e o divisor "ou"; saíram do código
  `signInWithOAuth`, `oauthProviderSchema` e o ícone `google`.
- Continua valendo tudo sobre o convite (itens 2–4).
- Os provedores seguem desabilitados em `supabase/config.toml`; reabrir o login
  social exige um novo ADR.

## Alternativas consideradas

- **Invite-only sem social:** mais simples, mas contraria o design aprovado e
  atrita o onboarding das revendedoras. *(Adotada na revisão de 2026-10-08: o
  onboarding já passa pelo link do convite, que define a senha.)*
- **Auto-registro de organização:** fora do escopo do MVP (SDD §6) e quebra o
  modelo B2B2B patrocinado pela fábrica.
