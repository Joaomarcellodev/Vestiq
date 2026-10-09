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

### `offers` — RF-OFFER-001..008
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
| `image_urls` | text[] | fotos da própria oferta (`0026`, RF-OFFER-008), no bucket `product-images` em `<org>/offers/`; vazio → `list_visible_offers` devolve as fotos do produto |

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
| `send_negotiation_message(p_negotiation_id uuid, p_body text)` | evento `MESSAGE` (1–1.000 caracteres, só as partes, negociação aberta); devolve o evento (ADR-0010) |
| `archive_product_to_offers(p_product_id uuid, p_network_id uuid, p_items jsonb)` | migration `0025`: cria uma oferta `ACTIVE` por variação com quantidade > 0 (≤ `stock_on_hand`, preço > 0, revendedora `ACTIVE` na rede) e arquiva produto + variações; erro em qualquer item → nada muda (AC-PROD-006-03/04, VES-69) |

Todas `security definer`, `set search_path = ''`, e revalidam a associação do
usuário à organização antes de escrever.

## Tempo real — chat de negociação (ADR-0010)

Migration `0020`: `negotiation_events` e `negotiations` estão na publicação
`supabase_realtime`. A tela de negociação assina `INSERT` de eventos e `UPDATE` da
negociação filtrando pelo id. O Realtime aplica as mesmas policies de `select`
(`can_access_negotiation`), então só as duas partes recebem as mudanças.

## Tempo real — notificações (ADR-0011)

Migration `0021`: `notifications` entra na publicação `supabase_realtime`. O sino
assina `INSERT` filtrando por `organization_id`. A policy `notifications_select`
(`is_org_member`) garante que só membros da organização destinatária recebam as
linhas. Nenhuma coluna ou policy nova, e a escrita continua exclusiva dos triggers.

## Projeção pública das ofertas (SPEC-008)

Migration `0022`. A policy `offers_select` libera a oferta para as revendedoras
da mesma rede, mas `products`/`product_variants` continuam visíveis só para a
dona. Por isso, sem esta função, quem via a oferta de outra revendedora ficava
sem o nome, a marca e a foto da peça. `list_visible_offers(p_offer_id?)`
(`security definer`, só `authenticated`) aplica a mesma regra da policy e devolve
apenas os campos públicos: vendedora, status, quantidade restante, preço de
transferência, observação, nome, marca, descrição, cor, tamanho e fotos. Nunca
`cost_price`, `retail_price`, `stock_on_hand` nem `sku` (SDD §8). O feed `/rede`
e o detalhe da oferta leem por ela.

## Funções de leitura — Fornecedores (SPEC-011)

Migration `0017`. A revendedora lê o catálogo das fábricas das suas redes sem
abrir a RLS de `products`/`product_variants`: uma policy de `select` exporia a
linha inteira, com `cost_price` e `stock_on_hand`. As funções abaixo são
`security definer`, filtram por `auth_supplier_ids()` e devolvem só colunas
públicas. `execute` só para `authenticated`.

| Função | Devolve |
| --- | --- |
| `auth_supplier_ids()` | fábricas ativas donas de redes ativas em que a org da usuária é membro `ACTIVE` |
| `list_suppliers(p_query text)` | fornecedores + nomes das redes + nº de produtos ativos (RF-SUP-001) |
| `search_supplier_products(p_query text, p_supplier_id uuid)` | até 100 produtos ativos com faixa de preço, pedido mínimo, grade e `in_stock` (RF-SUP-002) |
| `get_supplier_product(p_product_id uuid)` / `list_supplier_product_variants(p_product_id uuid)` | detalhe e variações com preço e `in_stock` (RF-SUP-003) |

Busca: `search_matches(haystack, query)` exige todas as palavras, sem diferenciar
maiúsculas nem acentos (`unaccent`), com `%`/`_` tratados como literais.

## Pedidos de abastecimento (SPEC-012)

Migrations `0018` (tipos de notificação) e `0019`. A revenda compra direto de um
fornecedor das suas redes. As tabelas só têm policy de `select` (membro da revenda
ou do fornecedor); toda escrita passa pelas funções abaixo.

| Tabela | Colunas principais |
| --- | --- |
| `supply_orders` | `reseller_id`, `supplier_id`, `status supply_order_status` (`PENDING`/`CONFIRMED`/`REJECTED`/`CANCELLED`), `note`, `response_note`, `cancel_reason`, `total_quantity`, `total_amount numeric(18,2)`, `responded_at`, `cancelled_at` |
| `supply_order_items` | `order_id`, `product_id`, `variant_id` + snapshot `product_name`, `color`, `size`, `sku`, `unit_price`; `quantity`; `line_total` (gerada). Único `(order_id, variant_id)` |

| Função | Garante |
| --- | --- |
| `list_supplier_order_catalog(p_supplier_id)` | variações ativas do fornecedor, só colunas públicas (sem custo nem saldo) |
| `place_supply_order(p_reseller_id, p_supplier_id, p_items jsonb, p_note)` | usuária membro da revenda; fornecedor da revenda (`is_supplier_of`); itens ativos, com preço, do fornecedor; soma variações repetidas; pedido mínimo por produto; grava o pedido com preço congelado |
| `respond_supply_order(p_order_id, 'confirm'\|'reject', p_note)` | `FACTORY_ADMIN`/`PLATFORM_ADMIN` do fornecedor; só a partir de `PENDING` |
| `cancel_supply_order(p_order_id, p_reason)` | membro da revenda; só a partir de `PENDING` |

O trigger `supply_orders_notify` avisa a fábrica de um novo pedido e de um
cancelamento, e avisa a revenda de uma confirmação ou recusa (link `/pedidos/<id>`).

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
