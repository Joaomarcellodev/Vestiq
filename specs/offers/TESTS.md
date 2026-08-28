# TESTS — Ofertas

## Matriz de rastreabilidade

| RF               | AC                   | TC          | Nível                 | Crítica §38       |
| ---------------- | -------------------- | ----------- | --------------------- | ----------------- |
| RF-OFFER-001     | AC-OFFER-001-01      | TC-OFFER-01 | integration           | não               |
| RF-OFFER-002     | AC-OFFER-002-01      | TC-OFFER-02 | integration           | não               |
| RF-OFFER-003     | AC-OFFER-003-01      | TC-OFFER-03 | integration           | sim (estoque)     |
| RF-OFFER-004     | AC-OFFER-004-01      | TC-OFFER-04 | integration           | sim (isolamento)  |
| RF-OFFER-005     | AC-OFFER-005-01      | TC-OFFER-05 | integration (2 redes) | sim (isolamento)  |
| RF-OFFER-004/005 | AC-OFFER-privacidade | TC-OFFER-06 | integration           | sim (privacidade) |
| RF-OFFER-006     | AC-OFFER-006-01      | TC-OFFER-07 | integration           | não               |
| RF-OFFER-006     | AC-OFFER-006-02      | TC-OFFER-08 | integration           | não               |
| RF-OFFER-007     | AC-OFFER-007-01      | TC-OFFER-09 | integration           | sim               |
| RF-OFFER-003     | AC-OFFER-arquivada   | TC-OFFER-10 | integration           | não               |

## Casos de teste

### TC-OFFER-01 — Publicar não reserva estoque

integration · oferta `ACTIVE`; `stock_on_hand` inalterado; `quantity_remaining = quantity_offered`.

### TC-OFFER-02 — Campos obrigatórios da oferta

integration · faltando preço/quantidade → erro; oferta completa persistida.

### TC-OFFER-03 — Limite pela disponibilidade

integration · **crítica** · `quantity_offered > stock_on_hand` → recusado.

### TC-OFFER-04 — Peer da rede enxerga

integration · **crítica (isolamento)** · B (mesma rede) vê oferta `ACTIVE` de A.

### TC-OFFER-05 — Rede alheia não enxerga

integration (2 redes) · **crítica (RF-OFFER-005)** · C da rede Y → `select` em ofertas de X = 0 linhas.

### TC-OFFER-06 — Projeção pública sem dados privados

integration · **crítica (SDD §8)** · `getOfferForViewer` como peer não retorna `stock_on_hand`, `cost_price`, nem dados de clientes/vendas; queries diretas nessas tabelas do dono → vazio.

### TC-OFFER-07 — Cancelar rejeita pendentes

integration · oferta `ACTIVE` + 2 propostas `PENDING` → cancelar → oferta `CANCELLED`, propostas `REJECTED`.

### TC-OFFER-08 — Cancelamento bloqueado

integration · negociação `ACCEPTED` presente → cancelar recusado.

### TC-OFFER-09 — quantity_remaining e status pós-conclusão

integration · **crítica** · concluir 3 de 4 → remaining 1, `PARTIALLY_NEGOTIATED`; concluir a última → `FULFILLED`.

### TC-OFFER-10 — Variação arquivada cancela oferta

integration · arquivar variação → oferta `CANCELLED`.

## Cobertura de RF

`RF-OFFER-001..007` ✔
