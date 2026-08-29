# Estratégia de Testes

Cobre SDD §19 (RNF-TEST), §34 (Test Strategy) e §38 (Política de Cobertura).

## Metas

| Meta | Valor |
| --- | --- |
| RF do MVP com ≥ 1 caso de teste | 100% (RNF-TEST-001) |
| Regras críticas com teste automatizado | 100% (RNF-TEST-002, SDD §38) |
| Fluxos críticos com E2E | sim (RNF-TEST-003) |
| Cobertura de linhas | indicador auxiliar, **não** substitui cobertura comportamental |

**Regras críticas** (exigem 100%): estoque (nunca negativo, movimento por
alteração), venda (baixa/estorno atômicos), negociação (transições de estado,
transferência transacional), autorização, isolamento de dados.

## Pirâmide

```
        ┌───────────┐
        │    E2E    │  Playwright — fluxos de negócio ponta a ponta (SDD §35)
        ├───────────┤
        │Integration│  Vitest + Supabase local — repositories, RPC, RLS
        ├───────────┤
        │ Component  │  Vitest + Testing Library — formulários, estados de UI
        ├───────────┤
        │   Unit     │  Vitest — cálculos, validações Zod, máquinas de estado
        └───────────┘
```

## Ferramentas

| Nível | Stack | Comando |
| --- | --- | --- |
| Unit / Component | Vitest, @testing-library/react, jsdom | `npm test` |
| Integration | Vitest + `supabase start` (Postgres real) | `npm test` (com DB no ar) |
| E2E | Playwright (`chromium` + `mobile`) | `npm run test:e2e` |
| Cobertura | `@vitest/coverage-v8` | `npm run test:coverage` |

## Convenções

- Arquivo de teste ao lado do código: `x.ts` → `x.test.ts`.
- Testes de integração/RLS: sufixo `.integration.test.ts`. Exigem `supabase start`;
  quando o stack está fora do ar eles fazem `describe.skip` (não quebram, mas a
  cobertura cai — o gate do CI portanto sobe o Supabase). Rodam no ambiente `node`
  do vitest (`environmentMatchGlobs`).
- E2E em `e2e/<fluxo>.spec.ts`. Helpers compartilhados em `e2e/helpers.ts`
  (`login`, `createUser` via admin API, `latestEmailBody` via Mailpit `54424`,
  `toast`/`formAlert` locators).
- Nomear pelo comportamento: `it("bloqueia venda acima do estoque disponível")`.

## Harness de Server Actions (`src/test/`)

As Server Actions/queries do Next chamam `createClient()` (cookies) e
`redirect()`/`revalidatePath()`. O harness torna isso testável **de verdade**
contra o Supabase local:

- `src/test/setup.ts` — `vi.mock` global de `next/cache`, `next/navigation`
  (`redirect` lança `RedirectError`; `useRouter`/`usePathname`/`useSearchParams`
  vêm de setters), `next/headers` e `@/lib/supabase/server` (devolve o client
  injetado). Também polyfills de jsdom (`IntersectionObserver`, `ResizeObserver`,
  `matchMedia`, `URL.createObjectURL`) para `motion`/`recharts`.
- `src/test/next.ts` — `setPathname`, `setSearchParams`, `setCookie`, `routerSpy`,
  `resetNext`, classes `RedirectError`/`NotFoundError`.
- `src/test/actions.ts` — `setTestClient(client)` injeta o client autenticado;
  `formData(obj)`, `pngFile()`/`textFile()`, `expectRedirect(fn, matcher)`, e
  fábricas (`makeCategory`, `makeCustomer`, `makeNetwork`, `addMember`,
  `inviteMember`, `stockUp`). Reusa `src/test/supabase.ts` (`makeUser`, `makeOrg`,
  `makeProduct`, `makeVariant`, `admin`, `supabaseUp`).

Padrão:
```ts
const up = await supabaseUp();
const d = up ? describe : describe.skip;
d("createProduct", () => {
  beforeEach(async () => { const u = await makeUser(); await makeOrg(u.userId); setTestClient(u.client); });
  afterEach(() => clearTestClient());
  it("…", async () => {
    await expectRedirect(() => createProduct({}, formData({ name: "X", variants: "[]" })),
      /\/produtos\/[0-9a-f-]{36}\?toast=product-created/);
  });
});
```

## Unit — o que cobrir

- Schemas Zod (`features/*/validation.ts`): aceita válido, rejeita cada inválido.
- Cálculos: subtotal/desconto/total de venda, margem, saldo a partir de movimentos.
- Máquinas de estado: `negotiation_transition` — toda transição legal e ilegal.
- `utils/` puros.

## Integration — o que cobrir

- Policies RLS: para cada tabela de domínio, um teste com **dois** tenants prova
  que A não lê/escreve dados de B.
- Funções RPC (`confirm_sale`, `cancel_sale`, `complete_negotiation`,
  `adjust_inventory`): caminho feliz **e** rollback em falha parcial
  (RF-SALE-006/009, RF-NEG-007/008).
- Trigger de `stock_on_hand` == `sum(inventory_movements.quantity)`.
- Constraint `stock_on_hand >= 0` (RF-INV-005).

## Component — o que cobrir

- `LoginForm`: erro de credencial, erro de campo, estado `loading`, botões OAuth.
- Formulários com Zod: exibição de mensagens, `aria-invalid`, submit desabilitado.
- Estados assíncronos: `loading` / `empty` / `error` renderizam (RNF-USA-003).

## E2E — fluxo obrigatório (SDD §35)

`e2e/fluxo-principal.spec.ts` antes da release do MVP:

```
Factory Admin faz login → cria rede → convida revendedora
→ revendedora aceita → cadastra categoria → produto → variação
→ registra entrada de estoque → publica oferta
→ 2ª revendedora encontra oferta → envia proposta
→ 1ª aceita → conclui negociação
→ estoque de origem diminui → estoque de destino aumenta
→ histórico permanece registrado
```

Mais E2E por sprint: login/logout/guarda de rota, registrar+cancelar venda,
cadastro de produto com variações.

## Cobertura

`npm run test:coverage` — gate no CI (`vitest.config.ts` → `coverage.thresholds`).

- **Incluído:** lógica de negócio (`features/*/{actions,queries,validation}.ts`),
  componentes (`components/**`, `features/*/components/**`), `lib/{theme,i18n,toast,utils}`,
  `components/motion/**`.
- **Excluído (coberto por E2E, não por vitest):** `app/**/{page,layout,loading,error}.tsx`,
  `app/**/route.ts`, `lib/supabase/**`, `proxy.ts`, `lib/env.ts`, `**/index.ts`.
- **Floor atual:** statements/lines 95, functions 88, branches 79 (real ≈ 98 / 90 / 81).
  Subir os thresholds conforme a cobertura melhora; nunca baixar sem nota no PR.

## CI (GitHub Actions — `.github/workflows/ci.yml`)

```
npm ci → lint → typecheck → supabase start → gerar .env.local
       → test:coverage (unit + integração + gate)
       → playwright install → db:reset + seed → e2e (chromium)
       → upload coverage/ + playwright-report/
```

`main` e `develop` protegidas: PR só faz merge com o job verde, review aprovado e
o checklist de PR do SDD §42 preenchido.

## Definition of Done (recorte de testes — SDD §37)

- [ ] Testes unitários previstos no `TESTS.md` da feature: verdes.
- [ ] Testes de integração previstos: verdes.
- [ ] E2E do fluxo (quando aplicável): verde.
- [ ] RLS validada com dois tenants quando a feature toca dados.
- [ ] Todo `RF-*` da feature aparece em pelo menos um `TC-*`.
