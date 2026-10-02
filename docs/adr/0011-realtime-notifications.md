# ADR-0011 — Notificações em tempo real e alertas do navegador

- **Status:** Aceito
- **Data:** 2026-09-28
- **Estende:** [ADR-0010](./0010-realtime-negotiation-chat.md)
- **Requisitos:** RF-NOTIF-001..003 (SPEC-013, VES-22)

## Contexto

As notificações in-app (migration `0015`) já eram gravadas por triggers no momento
do evento, mas o sino as buscava por polling a cada 60 s. A revendedora pediu para
ser avisada de propostas e mensagens novas "mesmo sem a tela aberta".

## Decisão

1. **Sino ao vivo.** A migration `0021` adiciona `notifications` à publicação
   `supabase_realtime`. O sino assina `INSERT` filtrando por `organization_id` da
   organização ativa. O Realtime aplica a policy `notifications_select`, então só
   membros da organização recebem as linhas. Mesmo padrão da ADR-0010.
2. **Robustez.** A cada `SUBSCRIBED`, o sino rebusca `/api/notifications`, cobrindo o
   intervalo entre o render do servidor (ou uma queda de conexão) e o socket. As
   entregas são deduplicadas por `id`. O polling de 60 s continua como reserva, mas
   só roda enquanto o canal não está conectado.
3. **Aba em segundo plano.** Com a permissão concedida (opt-in por clique no painel
   do sino) e `document.visibilityState === "hidden"`, o sino cria um
   `new Notification(...)`. Clicar no alerta foca a janela, marca como lida e abre o link.
4. **Título da aba.** O sino mantém o prefixo `(N) ` no `document.title` e o
   reaplica quando a página troca o `<title>` (MutationObserver no `<head>`).

## Consequências

- Propostas e mensagens aparecem em ~1 s em qualquer página, e não só no chat.
- Um WebSocket por aba aberta (o mesmo cliente do chat; canais diferentes).
- O Supabase hospedado precisa da migration `0021` (`supabase db push`).
- **Limitação:** com o navegador fechado não há aviso. No Chrome Android,
  `new Notification()` exige service worker, então lá só o sino e o título atualizam.
  Os dois casos ficam para a task de **Web Push** (service worker, VAPID, tabela de
  inscrições e envio pelo servidor).

## Alternativas consideradas

- **Reduzir o polling (ex.: 5 s):** mais carga no banco por aba aberta e ainda com atraso.
- **Web Push já nesta entrega:** cobre o navegador fechado, mas exige secrets VAPID na
  Netlify, um emissor no servidor e HTTPS para testar ponta a ponta. Ficou para a
  próxima task, e esta entrega não bloqueia nem descarta nada daquele caminho.
