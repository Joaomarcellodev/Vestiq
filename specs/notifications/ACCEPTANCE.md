# ACCEPTANCE — Notificações em tempo real

Critérios em Gherkin. Cada critério ancora em um RF e é coberto por ao menos um
`TC-*` em `TESTS.md`.

## AC-NOTIF-001-01 — Proposta nova aparece no sino sem recarregar

**Dado** que a vendedora está logada com o Vestiq aberto em qualquer página
**Quando** uma compradora envia uma proposta para uma oferta dela
**Então** o contador do sino aumenta em até alguns segundos, sem recarregar a página
**E** a notificação “Nova proposta recebida” aparece no topo do painel

## AC-NOTIF-001-02 — Mensagem nova aparece no sino sem recarregar

**Dado** que a vendedora participa de uma negociação aberta
**Quando** a compradora envia uma mensagem no chat
**Então** a notificação “Nova mensagem na negociação” chega ao sino da vendedora em tempo real

## AC-NOTIF-001-03 — Outra organização não recebe

**Dado** que uma terceira revendedora assina as notificações da organização da vendedora
**Quando** uma notificação é criada para a vendedora
**Então** a terceira revendedora não recebe nada
**E** quem gerou o evento também não é notificada

## AC-NOTIF-002-01 — Alerta do sistema com a aba em segundo plano

**Dado** que a vendedora ativou “Receber alertas neste dispositivo”
**E** a aba do Vestiq está em segundo plano
**Quando** chega uma notificação nova
**Então** o navegador mostra um alerta com o título e o resumo da notificação
**E** clicar no alerta foca o Vestiq, marca a notificação como lida e abre o link

## AC-NOTIF-002-02 — Sem alerta com a aba visível ou sem permissão

**Dado** que a aba do Vestiq está visível, ou que a permissão não foi concedida
**Quando** chega uma notificação nova
**Então** nenhum alerta do sistema é mostrado; só o sino atualiza

## AC-NOTIF-002-03 — Opt-in explícito

**Dado** que a permissão de notificações ainda não foi pedida
**Quando** a vendedora abre o sino
**Então** vê o botão “Receber alertas neste dispositivo”, e o pedido ao navegador só acontece ao clicar
**E** com a permissão negada, o painel explica como liberar nas configurações do navegador

## AC-NOTIF-003-01 — Contador no título da aba

**Dado** que há N notificações não lidas
**Então** o título da aba começa com `(N) `, mantido ao navegar entre páginas
**E** some quando não há nenhuma não lida
