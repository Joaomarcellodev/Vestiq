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
- Testes de integração/RLS: sufixo `.integration.test.ts`, exigem `supabase start`
  e são marcados para rodar em job separado no CI.
- E2E em `e2e/<fluxo>.spec.ts`.
- Nomear pelo comportamento: `it("bloqueia venda acima do estoque disponível")`.
- Cada `TESTS.md` de feature lista os `TC-<RF>-NN` e o arquivo que os implementa
  (rastreabilidade — SDD §32).

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

## CI (GitHub Actions)

```
lint  →  typecheck  →  unit+component  →  integration (supabase local)  →  e2e (build + run)
```

`main` e `develop` protegidas: PR só faz merge com todos os jobs verdes, review
aprovado e o checklist de PR do SDD §42 preenchido.

## Definition of Done (recorte de testes — SDD §37)

- [ ] Testes unitários previstos no `TESTS.md` da feature: verdes.
- [ ] Testes de integração previstos: verdes.
- [ ] E2E do fluxo (quando aplicável): verde.
- [ ] RLS validada com dois tenants quando a feature toca dados.
- [ ] Todo `RF-*` da feature aparece em pelo menos um `TC-*`.
