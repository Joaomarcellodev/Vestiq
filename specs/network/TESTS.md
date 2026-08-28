# TESTS — Rede da Fábrica

## Matriz de rastreabilidade

| RF         | AC            | TC        | Nível                   |
| ---------- | ------------- | --------- | ----------------------- |
| RF-NET-001 | AC-NET-001-01 | TC-NET-01 | integration             |
| RF-NET-002 | AC-NET-002-01 | TC-NET-02 | integration             |
| RF-NET-002 | AC-NET-002-02 | TC-NET-03 | integration             |
| RF-NET-003 | AC-NET-003-01 | TC-NET-04 | integration             |
| RF-NET-004 | AC-NET-004-01 | TC-NET-05 | e2e                     |
| RF-NET-004 | AC-NET-004-02 | TC-NET-06 | unit + integration      |
| RF-NET-004 | AC-NET-004-03 | TC-NET-07 | integration             |
| RF-NET-005 | AC-NET-005-01 | TC-NET-08 | integration             |
| RF-NET-006 | AC-NET-006-01 | TC-NET-09 | component + integration |
| RF-NET-007 | AC-NET-007-01 | TC-NET-10 | integration             |
| RF-NET-008 | AC-NET-008-01 | TC-NET-11 | integration (2 redes)   |
| RF-NET-008 | AC-NET-008-02 | TC-NET-12 | integration + e2e       |

## Casos de teste

### TC-NET-01 — Cadastrar fábrica

- integration · não-crítica · `PLATFORM_ADMIN` cria `FACTORY`; outros papéis recebem erro.

### TC-NET-02 — Criar rede

- integration · não-crítica · rede criada com `factory_id` correto e `status = ACTIVE`.

### TC-NET-03 — Rede exige fábrica

- integration · **crítica (integridade)** · vincular rede a `RESELLER` → erro (trigger/check).

### TC-NET-04 — Convite gera token + email

- integration · não-crítica · `network_members INVITED`, token único; mock de email chamado.

### TC-NET-05 — Aceite feliz

- e2e · **crítica (autorização)** · usuário com email do convite aceita → `ACTIVE`, vê a rede.

### TC-NET-06 — Token expirado/ inválido

- unit (validação de expiração) + integration · **crítica** · aceite recusado, sem vínculo.

### TC-NET-07 — Email divergente

- integration · **crítica** · `b@y.com` não aceita convite de `a@x.com`.

### TC-NET-08 — Vínculo registrado

- integration · **crítica** · após aceite: `organization_members` + `network_members` ativos e consistentes.

### TC-NET-09 — Listar membros

- component + integration · não-crítica · fábrica vê os N membros e status; revendedora não acessa a lista.

### TC-NET-10 — Desativar acesso

- integration · **crítica (autorização)** · `DISABLED` corta ofertas/negociações/diretório; dados próprios da revendedora intactos.

### TC-NET-11 — Isolamento entre redes

- integration (2 redes) · **crítica (isolamento)** · revendedora da rede X → `select` em ofertas/membros da Y = 0 linhas.

### TC-NET-12 — Diretório sem dados operacionais

- integration + e2e · **crítica (privacidade — SDD §8)** · perfil de peer expõe só campos públicos; queries de estoque/clientes/vendas do peer retornam vazio.

## Cobertura de RF

`RF-NET-001..008` ✔
