# SPEC-013 — Notificações em tempo real

- **Status:** Implementada
- **Sprint:** 3 (VES-22)
- **Requisitos SDD:** RF-NOTIF-001..003 (extensão de SPEC-008/009)
- **Telas:** sino de notificações (`TopAppBar`)
- **ADRs relacionados:** [ADR-0010](../../docs/adr/0010-realtime-negotiation-chat.md), [ADR-0011](../../docs/adr/0011-realtime-notifications.md)

## Contexto

A central de notificações in-app (migration `0015`) grava uma linha em
`notifications` para a organização destinatária a cada oferta publicada, evento de
negociação e pedido de abastecimento. O sino, porém, só buscava novidades a cada
60 s, e nada avisava a revendedora com a aba em segundo plano.

## Problema

Uma proposta ou mensagem nova pode ficar até um minuto sem aparecer. Se a
revendedora está em outra aba ou em outro programa, ela só descobre quando volta
ao Vestiq e abre o sino. Isso atrasa negociações que dependem de resposta rápida.

## Objetivo

Avisar a revendedora de uma mensagem ou proposta nova assim que ela chega, mesmo
sem a tela do Vestiq em primeiro plano.

## Escopo

- Entrega das notificações ao sino em tempo real (Supabase Realtime).
- Alerta do sistema operacional (Notification API do navegador) quando a aba está
  em segundo plano, com opt-in explícito.
- Contador de não lidas no título da aba.

## Fora do Escopo

- **Web Push com o navegador fechado** (service worker, VAPID, envio pelo servidor):
  task separada.
- E-mail de notificação.
- Preferências por tipo de notificação.

## Atores

Qualquer membro ativo de uma organização (revendedora ou fábrica).

## Requisitos Relacionados

| RF           | Descrição                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------- |
| RF-NOTIF-001 | Uma notificação nova aparece no sino e no contador sem recarregar a página e sem esperar o polling |
| RF-NOTIF-002 | Com a aba em segundo plano e permissão concedida, uma notificação nova gera um alerta do sistema   |
| RF-NOTIF-003 | O título da aba mostra quantas notificações não lidas existem                                      |

## User Stories

| ID          | Como…       | Quero…                                          | Para…                                      |
| ----------- | ----------- | ----------------------------------------------- | ------------------------------------------ |
| US-NOTIF-01 | revendedora | ver na hora que chegou uma proposta ou mensagem | responder rápido e não perder a negociação |
| US-NOTIF-02 | revendedora | ser avisada mesmo com o Vestiq em outra aba     | não precisar ficar olhando a tela          |
| US-NOTIF-03 | revendedora | escolher se o navegador pode me mostrar alertas | controlar as interrupções                  |

## Regras de Negócio

| ID          | Regra                                                                                                    | Origem      |
| ----------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| BR-NOTIF-01 | Só membros da organização destinatária recebem a notificação (RLS aplicada pelo Realtime)                | SECURITY    |
| BR-NOTIF-02 | O alerta do sistema só aparece com permissão concedida **e** aba oculta; com a aba visível, basta o sino | UX          |
| BR-NOTIF-03 | A permissão só é pedida por um clique da usuária (“Receber alertas neste dispositivo”)                   | Navegadores |
| BR-NOTIF-04 | Ao (re)conectar o canal, o sino rebusca a lista, cobrindo o que chegou com a conexão fora do ar          | ADR-0011    |
| BR-NOTIF-05 | O polling de 60 s continua como reserva, mas só enquanto o canal não está conectado                      | ADR-0011    |

## Fluxo Principal

1. A compradora envia uma proposta ou mensagem → o trigger grava a notificação da vendedora.
2. O Realtime entrega a linha ao sino da vendedora: a notificação aparece no topo e o contador sobe.
3. O título da aba passa a `(N) …`.
4. Com a aba oculta e alertas ativados, o navegador mostra o alerta. Clicar nele foca o Vestiq,
   marca a notificação como lida e abre o link.

## Fluxos Alternativos

- **Permissão ainda não pedida:** o painel do sino mostra “Receber alertas neste dispositivo”.
- **Permissão negada:** o painel explica como liberar nas configurações do navegador.
- **Navegador sem Notification API** (ou que exige service worker, como o Chrome no Android):
  sino e título funcionam, sem alerta do sistema.
- **Canal fora do ar:** o polling de 60 s volta a valer até reconectar.

## Estados

Sem estados novos: a notificação continua `read_at = null` (não lida) ou preenchida (lida).

## Critérios de Aceitação

Ver `ACCEPTANCE.md`.

## Modelo de Dados

Migration `0021`: `notifications` entra na publicação `supabase_realtime`. Nenhuma
coluna ou policy nova. A policy `notifications_select` (`is_org_member`) já limita a leitura.

## Segurança

- O socket do Realtime carrega o JWT da usuária (`realtime.setAuth()`), e o Realtime
  aplica a RLS de `select` a cada linha. Pedir o filtro de outra organização não entrega nada.
- Só os triggers `SECURITY DEFINER` escrevem em `notifications` (inalterado).

## Casos de Erro

| Situação                              | Resposta esperada                                    |
| ------------------------------------- | ---------------------------------------------------- |
| WebSocket cai                         | Polling de reserva; ao reconectar, rebusca a lista   |
| `new Notification()` lança (mobile)   | Ignora; sino e título continuam atualizando          |
| Mesma notificação entregue duas vezes | Deduplicada por `id`; o contador não sobe duas vezes |

## Testes Esperados

Ver `TESTS.md`.

## Tasks

- [x] Migration `0021` (publicação Realtime)
- [x] Helpers `features/notifications/live.ts`
- [x] Sino assinando o canal da organização, com alerta do sistema e título da aba
- [x] Testes unitários, de componente, de integração (RLS) e E2E
- [ ] Web Push com o navegador fechado (task separada)
