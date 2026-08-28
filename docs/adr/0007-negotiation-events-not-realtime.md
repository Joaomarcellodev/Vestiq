# ADR-0007 — "Chat" de negociação como timeline de eventos (sem realtime)

- **Status:** Aceito
- **Data:** 2026-08-28
- **Requisitos:** RF-NEG-009, SDD §6 (fora do escopo: "chat em tempo real")

## Contexto

A tela `docs/design/vestiq_chat_de_negocia_o` parece um chat: mensagens, card de
"Proposta de Transferência", status. Mas o SDD §6 lista "chat em tempo real"
como fora do escopo do MVP.

## Decisão

Modelar a conversa como **`negotiation_events`** (append-only): tipos `CREATED`,
`MESSAGE`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `COMPLETED`, cada um com `actor_id`,
`body` (texto) e `payload` (jsonb, ex.: snapshot da proposta).

- A tela renderiza a lista de eventos em ordem cronológica.
- Atualização por **refetch** (revalidação após enviar mensagem/ação; polling leve
  opcional na tela aberta). **Sem** Supabase Realtime/WebSocket no MVP.
- Enviar mensagem = Server Action que insere um evento `MESSAGE`.
- Ações de negociação (aceitar/recusar/cancelar/concluir) inserem o evento
  correspondente **na mesma transação** da mudança de status.

## Consequências

- RF-NEG-009 (histórico preservado) sai de graça — os eventos são o histórico.
- UX não é "tempo real", mas adequada para negociação B2B assíncrona.
- Migração futura para Realtime é aditiva (assinar a tabela), sem mudar o modelo.

## Alternativas consideradas

- **Supabase Realtime:** explicitamente fora do escopo; adiciona estado de
  conexão, reconexão e complexidade de teste.
- **Campo único de "mensagem":** perde o histórico e o encadeamento com as ações.
