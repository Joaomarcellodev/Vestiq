# TESTS — Organizações e Membros

## Matriz de rastreabilidade

| RF                       | AC        | TC        | Nível                   |
| ------------------------ | --------- | --------- | ----------------------- |
| RF-AUTH-004              | AC-ORG-03 | TC-ORG-01 | unit                    |
| RF-AUTH-004              | AC-ORG-04 | TC-ORG-02 | integration             |
| RF-AUTH-004 / RF-NET-008 | AC-ORG-05 | TC-ORG-03 | integration (2 tenants) |
| RF-AUTH-004              | AC-ORG-06 | TC-ORG-04 | integration             |
| RF-NET-005               | AC-ORG-01 | TC-ORG-05 | integration             |
| RF-AUTH-004              | AC-ORG-02 | TC-ORG-06 | e2e                     |
| —                        | AC-ORG-07 | TC-ORG-07 | integration             |
| —                        | AC-ORG-08 | TC-ORG-08 | component/e2e           |

## Casos de teste

### TC-ORG-01 — Resolver papel efetivo

- **Nível:** unit · **Crítica:** sim (autorização)
- **Esperado:** dado membership `{role: RESELLER, status: ACTIVE}`, `resolveRole()` → `RESELLER`; `status: DISABLED` → `null`.

### TC-ORG-02 — `requireOrgRole` nega papel insuficiente

- **Nível:** integration · **Crítica:** sim
- **Esperado:** `RESELLER` chamando fluxo `FACTORY_ADMIN` → exceção; sem escrita no banco.

### TC-ORG-03 — RLS isola organizações

- **Nível:** integration (2 tenants) · **Crítica:** sim (isolamento)
- **Passos:** popular dados em A e B; autenticar como membro de A; `select *` em cada tabela de domínio.
- **Esperado:** somente linhas de A.

### TC-ORG-04 — Revogar membership corta acesso

- **Nível:** integration · **Crítica:** sim
- **Passos:** ler dado de A (ok); `update organization_members set status='DISABLED'`; reler.
- **Esperado:** segunda leitura retorna 0 linhas.

### TC-ORG-05 — Organização ativa única

- **Nível:** integration · **Crítica:** não
- **Esperado:** usuário com 1 membership ativo → `getActiveOrganization()` retorna essa org.

### TC-ORG-06 — Estado aguardando convite

- **Nível:** e2e · **Crítica:** sim (isolamento)
- **Esperado:** usuário sem membership vê a tela e nenhuma navegação expõe dados.

### TC-ORG-07 — PLATFORM_ADMIN cria fábrica

- **Nível:** integration · **Crítica:** não
- **Esperado:** organização `FACTORY` criada; `RESELLER`/`FACTORY_ADMIN` recebem erro ao tentar o mesmo.

### TC-ORG-08 — Troca de organização ativa

- **Nível:** component + e2e · **Crítica:** não
- **Esperado:** seletor troca a org; preferência persiste (cookie/tabela) e reflete após novo login.

## Cobertura de RF

Contribui para `RF-AUTH-004` ✔, `RF-NET-005` ✔, `RF-NET-008` ✔ (completados nas features `auth` e `network`).
