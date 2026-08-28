# Modelo de Dados

Fonte canônica: SDD §23–§28. Este documento detalha o desenho físico para
implementação no PostgreSQL/Supabase. As migrations vivem em
`supabase/migrations/`, uma por entrega, e os tipos TypeScript são gerados por
`npm run db:types`.

## Visão geral

```
                       organizations ──< organization_members >── profiles (auth.users)
                       (FACTORY|RESELLER|PLATFORM)
                            │
             factory_id     │
                            ▼
                       factory_networks ──< network_members >── organizations (RESELLER)
                            │
   ┌────────────────────────┼─────────────────────────────────────────────┐
   │ (dados privados por organização RESELLER, isolados por RLS)          │
   │                                                                     │
   categories ──< products ──< product_variants ──< inventory_movements   │
                                     │                                    │
   customers ──< sales ──< sale_items ┘                                    │
                                     │                                    │
   offers (publica parte do estoque na rede) ─────────┐                    │
                                     │                │                    │
   negotiations ──< negotiation_events                │ (visível a peers)  │
   └─────────────────────────────────────────────────────────────────────┘
```

## Enums

```sql
create type organization_type as enum ('FACTORY', 'RESELLER', 'PLATFORM');
create type organization_status as enum ('ACTIVE', 'SUSPENDED');

create type member_role as enum ('PLATFORM_ADMIN', 'FACTORY_ADMIN', 'RESELLER');
create type member_status as enum ('ACTIVE', 'INVITED', 'DISABLED');

create type network_member_status as enum ('INVITED', 'ACTIVE', 'DISABLED');

create type inventory_movement_type as enum (
  'ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'CANCELAMENTO',
  'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SAIDA'
);                                                            -- SDD RF-INV-002

create type sale_status as enum ('CONFIRMED', 'CANCELLED');
create type payment_method as enum ('PIX', 'CARTAO', 'DINHEIRO');

create type offer_status as enum ('ACTIVE', 'PARTIALLY_NEGOTIATED', 'FULFILLED', 'CANCELLED');

create type negotiation_status as enum (
  'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'
);                                                            -- SDD RF-NEG-003

create type negotiation_event_type as enum (
  'CREATED', 'MESSAGE', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'
);
```

## Tabelas

Colunas comuns a todas as tabelas: `id uuid primary key default gen_random_uuid()`,
`created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
(trigger `set_updated_at`). "Tenant" = coluna usada pela RLS para isolamento.

### `profiles`
Espelha `auth.users`. Criado por trigger `on_auth_user_created`.

| coluna | tipo | notas |
| --- | --- | --- |
| `id` | uuid | = `auth.users.id` |
| `full_name` | text | |
| `avatar_url` | text | null |

### `organizations` — SDD §24
| coluna | tipo | notas |
| --- | --- | --- |
| `name` | text | not null |
| `type` | `organization_type` | not null |
| `status` | `organization_status` | default `ACTIVE` |

### `organization_members` — SDD §25
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid → organizations | **tenant** |
| `user_id` | uuid → profiles | |
| `role` | `member_role` | |
| `status` | `member_status` | |
| | | unique `(organization_id, user_id)` |

### `factory_networks` — SDD §26
| coluna | tipo | notas |
| --- | --- | --- |
| `factory_id` | uuid → organizations | `type = FACTORY` (check via trigger) |
| `name` | text | |
| `status` | `organization_status` | default `ACTIVE` |

### `network_members` — SDD §26
| coluna | tipo | notas |
| --- | --- | --- |
| `network_id` | uuid → factory_networks | |
| `reseller_id` | uuid → organizations | `type = RESELLER` |
| `status` | `network_member_status` | |
| `invited_email` | citext | usado antes do aceite (RF-NET-003) |
| `invite_token` | uuid | único, consumido no aceite (RF-NET-004) |
| `joined_at` | timestamptz | null até o aceite |
| | | unique `(network_id, reseller_id)` |

### `categories` — RF-PROD-001
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid → organizations | **tenant** (RESELLER) |
| `name` | text | unique `(organization_id, name)` |
| `archived_at` | timestamptz | null |

### `products` — RF-PROD-002
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid | **tenant** |
| `category_id` | uuid → categories | null |
| `name` | text | not null |
| `brand` | text | null |
| `description` | text | null |
| `internal_sku` | text | null, unique `(organization_id, internal_sku)` |
| `archived_at` | timestamptz | RF-PROD-006 — desativar sem apagar histórico |

### `product_variants` — RF-PROD-003/004, RF-INV-001
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid | **tenant** (denormalizado do product para RLS simples) |
| `product_id` | uuid → products | |
| `size` | text | null |
| `color` | text | null |
| `sku` | text | null, unique `(organization_id, sku)` |
| `cost_price` | numeric(12,2) | BRL |
| `retail_price` | numeric(12,2) | BRL |
| `stock_on_hand` | integer | not null default 0, **check >= 0** (RF-INV-005) |
| `archived_at` | timestamptz | |

`stock_on_hand` é cache. Fonte de verdade = soma de `inventory_movements`
([ADR-0005](./adr/0005-inventory-balance-from-movements.md)). Só é alterado
dentro da função que grava a movimentação.

### `inventory_movements` — RF-INV-002/003/004
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid | **tenant** |
| `product_variant_id` | uuid → product_variants | |
| `type` | `inventory_movement_type` | |
| `quantity` | integer | **assinado**: entradas > 0, saídas < 0 |
| `balance_after` | integer | saldo resultante (auditoria) |
| `reference_type` | text | null — `sale`, `negotiation`, `manual` |
| `reference_id` | uuid | null |
| `note` | text | null |
| `created_by` | uuid → profiles | |

Append-only. Sem `update`/`delete` via RLS (RF-INV-006).

### `customers` — RF-CUSTOMER-001..004
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid | **tenant** (RF-CUSTOMER-003) |
| `name` | text | not null |
| `email` | citext | null |
| `phone` | text | null |
| `document` | text | null — CPF |
| `archived_at` | timestamptz | |

### `sales` — RF-SALE-001..009
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid | **tenant** |
| `customer_id` | uuid → customers | null |
| `status` | `sale_status` | default `CONFIRMED` |
| `subtotal` | numeric(12,2) | soma dos itens |
| `discount` | numeric(12,2) | default 0 (RF-SALE-004) |
| `total` | numeric(12,2) | `subtotal - discount` |
| `payment_method` | `payment_method` | RF-SALE-005 |
| `sold_by` | uuid → profiles | |
| `cancelled_at` | timestamptz | RF-SALE-008 — permanece no histórico |
| `cancel_reason` | text | null |

### `sale_items` — RF-SALE-002/003
| coluna | tipo | notas |
| --- | --- | --- |
| `sale_id` | uuid → sales | |
| `organization_id` | uuid | **tenant** (denormalizado) |
| `product_variant_id` | uuid → product_variants | |
| `quantity` | integer | > 0 |
| `unit_price` | numeric(12,2) | preço no momento da venda |
| `line_total` | numeric(12,2) | `quantity * unit_price` |

### `offers` — RF-OFFER-001..007
| coluna | tipo | notas |
| --- | --- | --- |
| `organization_id` | uuid | **tenant** = revendedora ofertante |
| `network_id` | uuid → factory_networks | escopo de visibilidade (RF-OFFER-004/005) |
| `product_variant_id` | uuid → product_variants | |
| `quantity_offered` | integer | > 0, **≤ stock_on_hand** no momento (RF-OFFER-003) |
| `quantity_remaining` | integer | atualizado a cada negociação concluída (RF-OFFER-007) |
| `transfer_price` | numeric(12,2) | preço/condição B2B |
| `note` | text | null |
| `status` | `offer_status` | |

A oferta **não** reserva estoque; a validação de disponibilidade ocorre na
conclusão da negociação (transação).

### `negotiations` — RF-NEG-001..009
| coluna | tipo | notas |
| --- | --- | --- |
| `offer_id` | uuid → offers | |
| `network_id` | uuid → factory_networks | |
| `seller_org_id` | uuid → organizations | dona da oferta |
| `buyer_org_id` | uuid → organizations | interessada |
| `quantity` | integer | > 0 |
| `amount` | numeric(12,2) | valor proposto |
| `status` | `negotiation_status` | máquina de estados abaixo |
| `created_by` | uuid → profiles | |
| `completed_at` | timestamptz | |

RLS: visível **apenas** para membros de `seller_org_id` ou `buyer_org_id`.

### `negotiation_events` — RF-NEG-009, tela "chat de negociação"
| coluna | tipo | notas |
| --- | --- | --- |
| `negotiation_id` | uuid → negotiations | |
| `type` | `negotiation_event_type` | |
| `body` | text | null — texto da mensagem |
| `payload` | jsonb | null — snapshot (ex.: card de proposta) |
| `actor_id` | uuid → profiles | |

Append-only. Substitui chat em tempo real no MVP
([ADR-0007](./adr/0007-negotiation-events-not-realtime.md)).

## Máquina de estados — `negotiations`

```
           enviar proposta
  (none) ───────────────────▶ PENDING
                               │  │  │
             aceitar (seller)  │  │  └───────────▶ CANCELLED   (buyer cancela pendente — RF-NEG-005)
                               │  └──────────────▶ REJECTED    (seller rejeita — RF-NEG-004)
                               ▼
                            ACCEPTED
                               │
             concluir          │  (RF-NEG-006) — exige estoque suficiente na origem
                               ▼
                            COMPLETED  ──▶ gera TRANSFERENCIA_SAIDA (origem) + TRANSFERENCIA_ENTRADA (destino)
                                           na MESMA transação (RF-NEG-007/008)
```

Transições ilegais são rejeitadas pela função `negotiation_transition()` e
cobertas por testes (SDD §38).

## Funções transacionais (RPC)

Ver [ADR-0004](./adr/0004-atomic-operations-via-postgres-functions.md).

| Função | Garante |
| --- | --- |
| `confirm_sale(sale_input jsonb)` | cria `sales` + `sale_items` + N `inventory_movements (VENDA)` + atualiza `stock_on_hand`; aborta se algum item exceder o saldo (RF-SALE-006/007) |
| `cancel_sale(sale_id uuid, reason text)` | marca `CANCELLED` + `inventory_movements (CANCELAMENTO)` estornando cada item (RF-SALE-008/009) |
| `complete_negotiation(negotiation_id uuid)` | valida estado `ACCEPTED` + saldo na origem; grava `TRANSFERENCIA_SAIDA` e `TRANSFERENCIA_ENTRADA`; atualiza os dois `stock_on_hand` e `offers.quantity_remaining`; tudo ou nada (RF-NEG-007/008) |
| `adjust_inventory(variant_id uuid, delta int, note text)` | movimento `AJUSTE`, bloqueia saldo negativo (RF-INV-005) |
| `record_inventory_entry(variant_id uuid, qty int, note text)` | movimento `ENTRADA` |

Todas `security definer`, `set search_path = ''`, e revalidam a associação do
usuário à organização antes de escrever.

## Índices principais

```sql
create index on organization_members (user_id);
create index on network_members (reseller_id) where status = 'ACTIVE';
create index on products (organization_id) where archived_at is null;
create index on product_variants (product_id);
create index on inventory_movements (product_variant_id, created_at desc);
create index on sales (organization_id, created_at desc);
create index on offers (network_id, status) where status = 'ACTIVE';
create index on negotiations (seller_org_id, status);
create index on negotiations (buyer_org_id, status);
create index on negotiation_events (negotiation_id, created_at);
```

## Convenções de migration

- Nome: `NNNN_descricao_curta.sql` (timestamp do Supabase CLI).
- Uma entrega funcional = uma ou mais migrations coesas + regeneração de `database.ts`.
- Toda migration que cria tabela de domínio cria **junto** o `enable row level security`
  e as policies. PR sem policy para tabela nova é bloqueado ([SECURITY.md](./SECURITY.md)).
- Seeds de desenvolvimento em `supabase/seed.sql` (nunca dados reais).
