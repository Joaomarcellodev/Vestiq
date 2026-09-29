# TESTS — Notificações em tempo real

## Matriz de rastreabilidade

| RF           | AC                               | TC          | Nível            | Arquivo                                                                       |
| ------------ | -------------------------------- | ----------- | ---------------- | ----------------------------------------------------------------------------- |
| RF-NOTIF-001 | AC-NOTIF-001-01, AC-NOTIF-001-02 | TC-NOTIF-01 | unit + component | `features/notifications/live.test.ts`, `organisms/notification-bell.test.tsx` |
| RF-NOTIF-001 | AC-NOTIF-001-01, AC-NOTIF-001-02 | TC-NOTIF-05 | integration      | `features/notifications/notifications-realtime.integration.test.ts`           |
| RF-NOTIF-001 | AC-NOTIF-001-03                  | TC-NOTIF-06 | integration      | `features/notifications/notifications-realtime.integration.test.ts`           |
| RF-NOTIF-001 | AC-NOTIF-001-01                  | TC-NOTIF-07 | e2e              | `e2e/notifications.spec.ts`                                                   |
| RF-NOTIF-002 | AC-NOTIF-002-01, AC-NOTIF-002-02 | TC-NOTIF-02 | unit + component | `features/notifications/live.test.ts`, `organisms/notification-bell.test.tsx` |
| RF-NOTIF-002 | AC-NOTIF-002-03                  | TC-NOTIF-04 | component        | `organisms/notification-bell.test.tsx`                                        |
| RF-NOTIF-003 | AC-NOTIF-003-01                  | TC-NOTIF-03 | unit + component | `features/notifications/live.test.ts`, `organisms/notification-bell.test.tsx` |

## Casos de teste

### TC-NOTIF-01 — Notificação recebida entra no sino

- **Nível:** unit + component
- **Pré-condições:** sino com `organizationId`, canal Realtime simulado e conectado.
- **Passos:** entregar uma linha `INSERT`; entregar a mesma linha de novo.
- **Resultado esperado:** a notificação aparece no topo, o contador sobe 1 e a repetição é ignorada.
  Ao conectar, o sino rebusca `/api/notifications`.
- **Regra crítica (SDD §38):** não

### TC-NOTIF-02 — Alerta do sistema só com permissão e aba oculta

- **Nível:** unit + component
- **Passos:** entregar notificações com aba visível/oculta e permissão `granted`/`denied`; clicar no alerta.
- **Resultado esperado:** só `granted` + oculta gera alerta (título, corpo, `tag` = id). O clique
  fecha o alerta, marca como lida e navega para o link.
- **Regra crítica (SDD §38):** não

### TC-NOTIF-03 — Contador no título da aba

- **Nível:** unit + component
- **Passos:** renderizar com 2 não lidas, receber mais uma, trocar o título (navegação), desmontar.
- **Resultado esperado:** `(2) Vestiq` → `(3) Vestiq` → `(3) Negociações` → `Negociações`.
  O prefixo não se acumula e é limitado a `99+`.
- **Regra crítica (SDD §38):** não

### TC-NOTIF-04 — Opt-in de alertas

- **Nível:** component
- **Passos:** abrir o sino com permissão `default` e clicar em “Receber alertas neste dispositivo”;
  abrir com `denied`.
- **Resultado esperado:** o clique chama `Notification.requestPermission()` e o botão some ao conceder.
  Com `denied`, aparece a explicação.
- **Regra crítica (SDD §38):** não

### TC-NOTIF-05 — Proposta e mensagem chegam pelo Realtime

- **Nível:** integration (Supabase local)
- **Passos:** a vendedora assina as notificações da própria org; a compradora abre uma negociação e
  envia uma mensagem.
- **Resultado esperado:** chegam `NEGOTIATION_OPENED` (link da negociação, não lida) e `NEGOTIATION_MESSAGE`.
- **Regra crítica (SDD §38):** sim (isolamento multi-tenant)

### TC-NOTIF-06 — Isolamento: nada vaza para outra organização

- **Nível:** integration (Supabase local)
- **Passos:** uma terceira revendedora assina o filtro da org da vendedora; a compradora assina a própria;
  a compradora abre uma negociação.
- **Resultado esperado:** só a vendedora recebe. A terceira e a autora não recebem nada.
- **Regra crítica (SDD §38):** sim (RLS)

### TC-NOTIF-07 — Sino atualiza ao vivo entre duas sessões

- **Nível:** e2e
- **Passos:** a vendedora fica no dashboard; em outra sessão, a compradora envia uma proposta.
- **Resultado esperado:** o contador do sino da vendedora sobe sem recarregar a página.
- **Regra crítica (SDD §38):** não
