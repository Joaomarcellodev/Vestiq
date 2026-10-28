import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmButton } from "./confirm-button";
import { ActionForm } from "./action-form";

// VES-93 — destructive actions ask before submitting.
describe("ConfirmButton", () => {
  function setup(onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())) {
    render(
      <form onSubmit={onSubmit}>
        <ConfirmButton
          name="decision"
          value="reject"
          title="Recusar este pedido?"
          description="Não dá para desfazer."
          confirmLabel="Recusar pedido"
        >
          Recusar
        </ConfirmButton>
      </form>,
    );
    return onSubmit;
  }

  it("opens a labelled dialog instead of submitting", async () => {
    const onSubmit = setup();
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));

    const dialog = screen.getByRole("dialog", { name: "Recusar este pedido?" });
    expect(dialog).toHaveAccessibleDescription("Não dá para desfazer.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("'Voltar' closes the dialog and nothing is sent", async () => {
    const onSubmit = setup();
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("confirming submits the form with the button's name and value", async () => {
    let sent: FormData | null = null;
    setup(
      vi.fn((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        sent = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Recusar pedido" }),
    );
    expect(sent!.get("decision")).toBe("reject");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("inside an ActionForm, the action gets the submitter and its error shows", async () => {
    const action = vi.fn().mockResolvedValue({ error: "Pedido já respondido" });
    render(
      <ActionForm action={action}>
        <input type="hidden" name="orderId" value="o1" />
        <ConfirmButton name="decision" value="reject" title="Recusar?" description="Definitivo.">
          Recusar pedido
        </ConfirmButton>
      </ActionForm>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Recusar pedido" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Recusar pedido" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Pedido já respondido");
    const fd = action.mock.calls[0]![1] as FormData;
    expect(fd.get("decision")).toBe("reject");
    expect(fd.get("orderId")).toBe("o1");
  });
});
