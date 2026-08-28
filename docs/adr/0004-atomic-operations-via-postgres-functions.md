# ADR-0004 — Operações críticas como funções PostgreSQL transacionais

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** RF-SALE-006, RF-SALE-007, RF-SALE-009, RF-NEG-007, RF-NEG-008,
  RNF-REL-001, RNF-REL-002

## Contexto

Confirmar uma venda toca várias tabelas (`sales`, `sale_items`, N
`inventory_movements`, `product_variants.stock_on_hand`). Concluir uma negociação
toca dois tenants (movimento de saída na origem, entrada no destino) e a oferta.
O SDD exige atomicidade: "se uma das movimentações falhar, nenhuma deverá ser
persistida" (RF-NEG-008).

Fazer isso como várias chamadas do client Supabase não é transacional — uma
falha no meio deixa estoque inconsistente.

## Decisão

Implementar as operações críticas como **funções PL/pgSQL** (`security definer`,
`set search_path = ''`), chamadas via RPC a partir das Server Actions:

- `confirm_sale`, `cancel_sale`
- `complete_negotiation`
- `adjust_inventory`, `record_inventory_entry`

Cada função:

1. Revalida que o usuário (`auth.uid()`) pertence à(s) organização(ões) envolvida(s).
2. Executa todas as escritas em uma transação implícita (corpo da função).
3. Valida invariantes (saldo suficiente, estado da negociação) e faz `raise
   exception` para abortar — o rollback é automático.
4. Atualiza os caches (`stock_on_hand`, `offers.quantity_remaining`) junto com os
   movimentos.

## Consequências

- Atomicidade garantida pelo banco, não pela aplicação.
- Lógica crítica testável via testes de integração (Vitest + Supabase local),
  incluindo o cenário de rollback.
- A Server Action fica fina: valida input (Zod), chama a RPC, trata o erro.
- Regras de negócio críticas ficam em SQL — exige que o time versione e revise
  migrations com o mesmo rigor do TypeScript.
- `search_path = ''` obriga qualificar todos os objetos (`public.sales` etc.).

## Alternativas consideradas

- **Transação no client via PostgREST:** não suportado de forma robusta.
- **Fila + saga/compensação:** complexidade desnecessária para o volume do MVP.
- **Edge Function com transação:** mesma garantia que a RPC, porém mais partes
  móveis e latência extra.
