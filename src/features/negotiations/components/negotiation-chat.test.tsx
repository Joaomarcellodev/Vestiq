import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { routerSpy } from "@/test/next";
import type { ChatEvent } from "../chat";

// --- fake Supabase Realtime channel -----------------------------------------
type Handler = (payload: { new: unknown }) => void;
const handlers: Record<string, Handler> = {};
let statusCallback: (status: string) => void = () => {};
const channel = {
  on: vi.fn((_type: string, filter: { table: string; event: string }, cb: Handler) => {
    handlers[`${filter.event}:${filter.table}`] = cb;
    return channel;
  }),
  subscribe: vi.fn((cb: (status: string) => void) => {
    statusCallback = cb;
    return channel;
  }),
};
const removeChannel = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => channel,
    removeChannel,
    realtime: { setAuth: () => Promise.resolve() },
  }),
}));

const sendNegotiationMessage = vi.fn();
const refreshNegotiationEvents = vi.fn();
vi.mock("../actions", () => ({
  sendNegotiationMessage: (id: string, body: string) => sendNegotiationMessage(id, body),
  refreshNegotiationEvents: (id: string) => refreshNegotiationEvents(id),
}));

const { NegotiationChat } = await import("./negotiation-chat");

const ME = "user-me";
const THEM = "user-them";
const at = (min: number) => new Date(Date.UTC(2026, 8, 25, 13, min)).toISOString();
const ev = (id: string, over: Partial<ChatEvent> = {}): ChatEvent => ({
  id,
  type: "MESSAGE",
  body: id,
  createdAt: at(0),
  actorId: THEM,
  ...over,
});
const row = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  negotiation_id: "n1",
  type: "MESSAGE",
  body: id,
  created_at: at(5),
  actor_id: THEM,
  ...over,
});

function renderChat(props: Partial<React.ComponentProps<typeof NegotiationChat>> = {}) {
  return render(
    <NegotiationChat
      negotiationId="n1"
      currentUserId={ME}
      counterpartyName="Clara Boutique"
      initialEvents={[
        ev("created", { type: "CREATED", body: "Tenho interesse", createdAt: at(0) }),
        ev("mine", { body: "Consigo sexta", actorId: ME, createdAt: at(1) }),
      ]}
      open
      {...props}
    />,
  );
}

/** Lets the setAuth promise resolve and the channel subscribe. */
async function connect(status = "SUBSCRIBED") {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    statusCallback(status);
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  refreshNegotiationEvents.mockResolvedValue([]);
});

describe("NegotiationChat", () => {
  it("shows the counterparty's and my messages, status events and day separators", () => {
    // Same day as the fixtures, so the separator reads "Hoje" whatever day the suite runs.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(30));
    try {
      renderChat();
      const log = screen.getByRole("log", { name: "Mensagens" });
      expect(
        within(log).getByText("Proposta enviada · Clara Boutique · 10:00"),
      ).toBeInTheDocument();
      expect(within(log).getByText("Tenho interesse").className).toContain("rounded-bl-sm");
      expect(within(log).getByText("Consigo sexta").className).toContain("rounded-br-sm");
      expect(within(log).getAllByText("Hoje")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("subscribes to the negotiation, goes live and refetches to fill gaps", async () => {
    renderChat();
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
    refreshNegotiationEvents.mockResolvedValue([
      ev("missed", { body: "perdida", createdAt: at(2) }),
    ]);
    await connect();
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ table: "negotiation_events", filter: "negotiation_id=eq.n1" }),
      expect.any(Function),
    );
    expect(screen.getByText("Ao vivo")).toBeInTheDocument();
    expect(refreshNegotiationEvents).toHaveBeenCalledWith("n1");
    expect(await screen.findByText("perdida")).toBeInTheDocument();
    expect(routerSpy.refresh).not.toHaveBeenCalled();
  });

  it("shows a message from the other party as soon as it arrives, once", async () => {
    renderChat();
    await connect();
    act(() =>
      handlers["INSERT:negotiation_events"]!({ new: row("rt1", { body: "Chegou agora" }) }),
    );
    act(() =>
      handlers["INSERT:negotiation_events"]!({ new: row("rt1", { body: "Chegou agora" }) }),
    );
    expect(screen.getAllByText("Chegou agora")).toHaveLength(1);
    expect(routerSpy.refresh).not.toHaveBeenCalled();
  });

  it("refreshes the page for status changes", async () => {
    renderChat();
    await connect();
    act(() =>
      handlers["INSERT:negotiation_events"]!({ new: row("acc", { type: "ACCEPTED", body: null }) }),
    );
    expect(screen.getByText("Proposta aceita · Clara Boutique · 10:05")).toBeInTheDocument();
    expect(routerSpy.refresh).toHaveBeenCalledTimes(1);
    act(() => handlers["UPDATE:negotiations"]!({ new: {} }));
    expect(routerSpy.refresh).toHaveBeenCalledTimes(2);
  });

  it("flags a dropped connection and refreshes after reconnecting", async () => {
    renderChat();
    await connect();
    await act(async () => statusCallback("CHANNEL_ERROR"));
    expect(screen.getByText("Reconectando…")).toBeInTheDocument();
    await act(async () => statusCallback("SUBSCRIBED"));
    expect(screen.getByText("Ao vivo")).toBeInTheDocument();
    expect(refreshNegotiationEvents).toHaveBeenCalledTimes(2);
    expect(routerSpy.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows my message immediately and swaps it for the stored one", async () => {
    const user = userEvent.setup();
    let resolve!: (v: unknown) => void;
    sendNegotiationMessage.mockReturnValue(new Promise((r) => (resolve = r)));
    renderChat();

    await user.type(screen.getByLabelText("Mensagem"), "  Fechado!  {Enter}");
    expect(sendNegotiationMessage).toHaveBeenCalledWith("n1", "Fechado!");
    expect(screen.getByLabelText("Mensagem")).toHaveValue("");
    expect(screen.getByText("Fechado!")).toBeInTheDocument();
    expect(screen.getByText("Enviando…")).toBeInTheDocument();

    await act(async () =>
      resolve({ event: ev("stored", { body: "Fechado!", actorId: ME, createdAt: at(3) }) }),
    );
    expect(screen.getAllByText("Fechado!")).toHaveLength(1);
    expect(screen.queryByText("Enviando…")).not.toBeInTheDocument();
    expect(screen.getByText("10:03")).toBeInTheDocument();

    // the realtime echo of my own message doesn't duplicate it
    act(() =>
      handlers["INSERT:negotiation_events"]!({
        new: row("stored", { body: "Fechado!", actor_id: ME, created_at: at(3) }),
      }),
    );
    expect(screen.getAllByText("Fechado!")).toHaveLength(1);
  });

  it("gives the text back when sending fails", async () => {
    const user = userEvent.setup();
    sendNegotiationMessage.mockResolvedValue({ error: "Negociação encerrada" });
    renderChat();
    await user.type(screen.getByLabelText("Mensagem"), "ainda aí?{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Negociação encerrada");
    expect(screen.queryByText("ainda aí?")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mensagem")).toHaveValue("ainda aí?");
  });

  it("does not send blanks and closes the input once the negotiation ends", async () => {
    const user = userEvent.setup();
    const { unmount } = renderChat();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
    await user.type(screen.getByLabelText("Mensagem"), "   {Enter}");
    expect(sendNegotiationMessage).not.toHaveBeenCalled();
    unmount();
    expect(removeChannel).toHaveBeenCalled();

    renderChat({ open: false });
    expect(screen.queryByLabelText("Mensagem")).not.toBeInTheDocument();
    expect(screen.getByText("Negociação encerrada. O chat está fechado.")).toBeInTheDocument();
  });
});
