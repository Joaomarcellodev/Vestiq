# Segurança

Cobre os requisitos SDD §8 (privacidade), §19 (RNF-SEC) e §28 (isolamento
multi-tenant).

## Modelo de ameaça (MVP)

| Ativo | Ameaça principal | Mitigação |
| --- | --- | --- |
| Dados comerciais da revendedora | outra revendedora da rede lê estoque/clientes/vendas | RLS por `organization_id`; só `offers ACTIVE` cruzam a fronteira |
| Rede da fábrica | revendedora acessa rede à qual não pertence | RLS via `network_members` (RF-NET-008) |
| Sessão | roubo de token / rota privada sem auth | cookies HttpOnly do Supabase, `proxy.ts` + `requireUser()` (RF-AUTH-003) |
| Segredo de service-role | vazar para o cliente | nunca prefixar `NEXT_PUBLIC_`; `admin.ts` é `server-only` |
| Operações de estoque | estado inconsistente por falha parcial | funções PostgreSQL transacionais (RNF-REL-001/002) |

## Autenticação

- Supabase Auth. Provedores: email/senha + OAuth Google e Apple
  ([ADR-0002](./adr/0002-invite-and-social-auth.md)).
- `proxy.ts` renova a sessão em toda requisição e redireciona não autenticados
  para `/login` (RF-AUTH-003).
- `getCurrentUser()` / `requireUser()` em `features/auth/queries.ts` são o ponto
  único de verificação em Server Components e Actions.
- Logout: Server Action `signOut()` (RF-AUTH-002).

## Autorização por papel (RF-AUTH-004)

Papéis em `organization_members.role`: `PLATFORM_ADMIN`, `FACTORY_ADMIN`,
`RESELLER`. Verificação em duas camadas:

1. **Aplicação** — helpers `requireRole(...)` / `requireOrgRole(orgId, ...)` nas
   `queries.ts`/`actions.ts` da feature.
2. **Banco** — policies RLS que consultam `organization_members`. Mesmo que a
   aplicação falhe, o banco nega.

## Row Level Security

Regras gerais:

- **Toda** tabela de domínio: `alter table X enable row level security;` na mesma
  migration que a cria.
- Funções auxiliares (schema privado, `stable`, `security definer`):
  - `auth_org_ids()` → set de `organization_id` do usuário atual (`status = ACTIVE`).
  - `is_org_member(org uuid)` → boolean.
  - `has_org_role(org uuid, roles member_role[])` → boolean.
  - `shares_network(org_a uuid, org_b uuid)` → boolean (mesma `factory_networks`).
- Policy padrão para tabela `com organization_id`:
  ```sql
  create policy tenant_read  on <t> for select using (is_org_member(organization_id));
  create policy tenant_write on <t> for all
    using (is_org_member(organization_id))
    with check (is_org_member(organization_id));
  ```
- **Exceção de rede** (única travessia de fronteira — SDD §8):
  ```sql
  -- offers: peers da mesma rede veem apenas ofertas ativas
  create policy offer_network_read on offers for select using (
    is_org_member(organization_id)
    or (status = 'ACTIVE' and exists (
      select 1 from network_members nm
      where nm.network_id = offers.network_id
        and nm.reseller_id in (select auth_org_ids())
        and nm.status = 'ACTIVE'))
  );
  ```
- `negotiations` / `negotiation_events`: visíveis só a membros de `seller_org_id`
  ou `buyer_org_id`.
- `inventory_movements`: `select` para membros da org; **sem** `update`/`delete`
  (RF-INV-006). Inserção somente via RPC `security definer`.

Ver a matriz completa por tabela em cada `specs/<feature>/SPEC.md` (seção
Segurança) e o teste de isolamento em `specs/<feature>/TESTS.md`.

## Segredos e variáveis de ambiente

| Variável | Exposição | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | todos os clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública | browser/server client (protegida por RLS) |
| `SUPABASE_SECRET_KEY` | **server-only** | `lib/supabase/admin.ts`, seeds, jobs |
| `NEXT_PUBLIC_SITE_URL` | pública | `redirectTo` do OAuth |

- `.env` e `.env*.local` no `.gitignore`. Só `.env.example` versionado.
- `src/lib/env.ts` valida no boot e falha rápido se faltar variável.
- RNF-SEC-004: nenhuma service-role key no cliente — garantido pelo prefixo e pelo
  guard `import "server-only"`.

## Transporte

RNF-SEC-001: HTTPS em produção (garantido pelo host). HSTS e headers de segurança
configurados em `next.config.ts` antes do piloto (Sprint 7).

## Checklist de PR (segurança)

Todo PR que toca dados declara em `Security impact:` e `Database impact:`:

- [ ] Tabela nova tem `enable row level security` + policies na mesma migration.
- [ ] Policy testada com dois tenants (org A não enxerga org B).
- [ ] Nenhuma query de domínio usa o client `admin` sem justificativa no código.
- [ ] Server Action valida entrada com Zod antes de tocar o banco.
- [ ] Rota/ação nova verifica `requireUser()` e o papel quando aplicável.
- [ ] Sem segredo novo com prefixo `NEXT_PUBLIC_`.
- [ ] Operação crítica de estoque/negociação passa por função transacional.

## Auditoria pré-piloto (Sprint 7)

- Varredura de todas as policies com o linter do Supabase.
- Teste E2E negativo: revendedora B tentando ler/alterar dados de A por todas as rotas.
- Revisão de cada uso de `createAdminClient()`.
- Pen-test leve dos fluxos de autenticação e convite.
