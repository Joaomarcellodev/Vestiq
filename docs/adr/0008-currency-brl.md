# ADR-0008 — Moeda única: Real (BRL)

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** SDD §6 (fora do escopo: "múltiplas moedas")

## Contexto

Os protótipos misturam `R$` (registrar venda, oferta, negociação) e `$`
(dashboard, detalhes do cliente em inglês). Decisão do time: **Real**.

## Decisão

- Toda a plataforma opera em **BRL**. Sem campo de moeda no schema no MVP.
- Valores monetários: `numeric(12,2)` no banco; nunca `float`.
- Formatação na UI: `Intl.NumberFormat("pt-BR", { style: "currency", currency:
  "BRL" })`, encapsulado em `utils/currency.ts` e no componente `PriceField` /
  `MoneyInput`.
- Entrada de valores: componente `MoneyInput` com máscara `R$ 0,00`, armazenando
  centavos como inteiro no estado e enviando `numeric` ao servidor.
- Telas de referência em inglês/`$` são portadas para pt-BR/`R$`.

## Consequências

- Sem conversão de câmbio, sem `currency` em `sales`/`offers`/`negotiations`.
- Locale da app fixado em `pt-BR`.
- Pós-MVP (multi-moeda) exigirá coluna `currency` + tabela de câmbio — aditivo.

## Alternativas consideradas

- **Guardar `currency` desde já:** custo sem benefício no MVP (SDD §6).
