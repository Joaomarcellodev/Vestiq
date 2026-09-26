# ADR-0010 — Chat de negociação em tempo real (Supabase Realtime)

- **Status:** Aceito
- **Data:** 2026-09-25
- **Substitui:** a parte "sem realtime" da [ADR-0007](./0007-negotiation-events-not-realtime.md)
- **Requisitos:** RF-NEG-010, RF-NEG-011 (SPEC-009)

## Contexto

A ADR-0007 modelou a conversa como `negotiation_events` e adiou o tempo real
(SDD §6). Na prática, a revendedora envia uma mensagem e a outra parte só a vê
recarregando a página. Isso inviabiliza combinar detalhes durante a negociação.
O produto pediu o chat funcionando de verdade: enviar e receber na hora.

## Decisão

Manter o modelo da ADR-0007 (`negotiation_events` append-only) e **assinar a
tabela com Supabase Realtime** (`postgres_changes`):

- A migration `0020` adiciona `negotiation_events` e `negotiations` à publicação
  `supabase_realtime`. O Realtime aplica a RLS existente (`can_access_negotiation`
  / `negotiations_select`) a cada assinante, então só as duas partes recebem os eventos.
- A tela assina `INSERT` em `negotiation_events` e `UPDATE` em `negotiations`,
  filtrando pelo id da negociação.
- Enviar mensagem = RPC `send_negotiation_message`, que valida e devolve o evento
  criado. A tela mostra a mensagem na hora (otimista) e troca pelo evento real.
  Nada de recarregar a página.
- Eventos de status (aceita, recusada, concluída…) e `UPDATE` na negociação
  disparam `router.refresh()` para atualizar status e botões.
- **Robustez:** a cada (re)conexão do canal, a tela rebusca a lista de eventos,
  cobrindo mensagens perdidas enquanto a conexão caiu. Eventos são deduplicados
  por `id`. Com o canal fora do ar, a tela mostra "Reconectando…", e o envio
  continua funcionando, porque ele não depende do WebSocket.

## Consequências

- Mensagens chegam em ~1 s para a outra parte, sem polling.
- Cada tela de negociação aberta mantém um WebSocket com o Supabase, dentro das
  cotas do plano (conexões simultâneas).
- O Supabase hospedado precisa da migration `0020` (`supabase db push`).
  Nenhuma configuração extra no painel.
- Testes: a integração cobre RPC e RLS. O E2E abre duas sessões e verifica a
  entrega sem reload.

## Alternativas consideradas

- **Polling** (ex.: a cada 3 s): simples, mas com atraso perceptível e carga
  constante no banco por tela aberta.
- **Realtime Broadcast:** exigiria o cliente publicar a mensagem além de gravá-la
  (duas fontes da verdade) ou triggers com `realtime.send`. `postgres_changes`
  reaproveita a RLS e a tabela que já é o histórico.
