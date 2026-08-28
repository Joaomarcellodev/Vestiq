# TESTS — Autenticação

## Matriz de rastreabilidade

| RF          | AC             | TC             | Nível       | Arquivo                                            |
| ----------- | -------------- | -------------- | ----------- | -------------------------------------------------- |
| RF-AUTH-001 | AC-AUTH-001-01 | TC-AUTH-001-01 | e2e         | `e2e/auth.spec.ts`                                 |
| RF-AUTH-001 | AC-AUTH-001-02 | TC-AUTH-001-02 | component   | `src/features/auth/components/login-form.test.tsx` |
| RF-AUTH-001 | AC-AUTH-001-03 | TC-AUTH-001-03 | unit        | `src/features/auth/validation.test.ts`             |
| RF-AUTH-001 | AC-AUTH-001-03 | TC-AUTH-001-04 | unit        | `src/features/auth/validation.test.ts`             |
| RF-AUTH-001 | AC-AUTH-001-04 | TC-AUTH-001-05 | e2e         | `e2e/auth.spec.ts` (mock provider)                 |
| RF-AUTH-001 | AC-AUTH-001-05 | TC-AUTH-001-06 | integration | `src/app/auth/callback/route.test.ts`              |
| RF-AUTH-002 | AC-AUTH-002-01 | TC-AUTH-002-01 | e2e         | `e2e/auth.spec.ts`                                 |
| RF-AUTH-003 | AC-AUTH-003-01 | TC-AUTH-003-01 | e2e         | `e2e/auth.spec.ts`                                 |
| RF-AUTH-003 | AC-AUTH-003-02 | TC-AUTH-003-02 | e2e         | `e2e/auth.spec.ts`                                 |
| RF-AUTH-003 | AC-AUTH-003-03 | TC-AUTH-003-03 | unit        | `src/features/auth/actions.test.ts`                |
| RF-AUTH-003 | AC-AUTH-003-04 | TC-AUTH-003-04 | integration | `src/proxy.test.ts`                                |
| RF-AUTH-004 | AC-AUTH-004-01 | TC-AUTH-004-01 | integration | `src/features/auth/guards.integration.test.ts`     |
| RF-AUTH-004 | AC-AUTH-004-02 | TC-AUTH-004-02 | integration | `src/features/auth/rls.integration.test.ts`        |
| RF-AUTH-004 | AC-AUTH-004-03 | TC-AUTH-004-03 | e2e         | `e2e/auth.spec.ts`                                 |

## Casos de teste

### TC-AUTH-001-01 — Login com credenciais válidas

- **Nível:** e2e · **Crítica:** não
- **Pré:** usuário seed `reseller@demo.com` / `demo1234`, com membership ativo.
- **Passos:** abrir `/login`; preencher; submeter.
- **Esperado:** URL vira `/dashboard`; nome do usuário no cabeçalho.

### TC-AUTH-001-02 — Erro genérico em credencial inválida

- **Nível:** component · **Crítica:** não
- **Pré:** `signInWithPassword` mockado retornando erro.
- **Passos:** renderizar `<LoginForm>`; preencher; submeter.
- **Esperado:** alerta "Email ou senha incorretos."; input de email mantém valor.

### TC-AUTH-001-03 — Zod rejeita email inválido

- **Nível:** unit · **Crítica:** não
- **Esperado:** `credentialsSchema.safeParse({email:"x",password:"y"})` → `success:false`, erro "Email inválido.".

### TC-AUTH-001-04 — Zod exige senha

- **Nível:** unit · **Crítica:** não
- **Esperado:** senha vazia → `success:false`.

### TC-AUTH-001-05 — Login social feliz

- **Nível:** e2e (provider fake / Supabase local) · **Crítica:** não
- **Esperado:** após callback com `code` válido, sessão criada e redirect a `next`.

### TC-AUTH-001-06 — Callback sem código

- **Nível:** integration · **Crítica:** não
- **Passos:** `GET /auth/callback` sem `code`.
- **Esperado:** 307 para `/login?error=oauth`.

### TC-AUTH-002-01 — Logout encerra sessão

- **Nível:** e2e · **Crítica:** não
- **Passos:** logado, acionar "Sair"; depois acessar `/dashboard`.
- **Esperado:** vai para `/login`; `/dashboard` redireciona para `/login`.

### TC-AUTH-003-01 — Guarda de rota

- **Nível:** e2e · **Crítica:** sim (autorização)
- **Passos:** sem sessão, abrir `/dashboard`.
- **Esperado:** redirect `/login?next=%2Fdashboard`.

### TC-AUTH-003-02 — Retorno ao destino

- **Nível:** e2e · **Crítica:** não
- **Esperado:** login a partir de `/login?next=/vendas` termina em `/vendas`.

### TC-AUTH-003-03 — Sanitização de `next`

- **Nível:** unit · **Crítica:** sim (segurança)
- **Esperado:** `sanitizeNext("https://mal.com")` → `/dashboard`; `sanitizeNext("//mal")` → `/dashboard`; `sanitizeNext("/vendas")` → `/vendas`.

### TC-AUTH-003-04 — Sessão expirada

- **Nível:** integration · **Crítica:** sim (autorização)
- **Passos:** cookie de sessão inválido; requisição a rota privada.
- **Esperado:** proxy redireciona para `/login`.

### TC-AUTH-004-01 — `requireRole` bloqueia papel errado

- **Nível:** integration · **Crítica:** sim (autorização)
- **Esperado:** `RESELLER` em ação `FACTORY_ADMIN` → erro; sem escrita.

### TC-AUTH-004-02 — RLS isola organizações

- **Nível:** integration (2 tenants) · **Crítica:** sim (isolamento)
- **Esperado:** cliente autenticado como A → `select` em dados de B retorna 0 linhas.

### TC-AUTH-004-03 — Usuário sem organização

- **Nível:** e2e · **Crítica:** sim (isolamento)
- **Esperado:** tela "aguardando convite"; nenhuma listagem de dados acessível.

## Cobertura de RF

`RF-AUTH-001` ✔ · `RF-AUTH-002` ✔ · `RF-AUTH-003` ✔ · `RF-AUTH-004` ✔
