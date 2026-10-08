import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionForm, SubmitButton, type FormActionState } from "./action-form";

describe("ActionForm", () => {
  it("shows the action error and keeps what was typed (VES-74)", async () => {
    const action = vi.fn(
      async (_prev: FormActionState, _fd: FormData): Promise<FormActionState> => ({
        error: "Venda já cancelada",
      }),
    );
    render(
      <ActionForm action={action}>
        <input aria-label="Motivo" name="reason" />
        <SubmitButton>Cancelar venda</SubmitButton>
      </ActionForm>,
    );

    await userEvent.type(screen.getByLabelText("Motivo"), "cliente desistiu");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar venda" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Venda já cancelada");
    expect(screen.getByLabelText("Motivo")).toHaveValue("cliente desistiu");
    expect(action.mock.calls[0]![1].get("reason")).toBe("cliente desistiu");
  });

  it("sends the clicked button's name and value (negotiation actions)", async () => {
    const action = vi.fn(
      async (_prev: FormActionState, _fd: FormData): Promise<FormActionState> => ({
        error: "Estoque insuficiente na origem",
      }),
    );
    render(
      <ActionForm action={action}>
        <input type="hidden" name="negotiationId" value="n1" />
        <SubmitButton name="action" value="cancel">
          Cancelar
        </SubmitButton>
        <SubmitButton name="action" value="complete">
          Concluir transferência
        </SubmitButton>
      </ActionForm>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Concluir transferência" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Estoque insuficiente na origem");
    const sent = action.mock.calls[0]![1];
    expect(sent.get("action")).toBe("complete");
    expect(sent.get("negotiationId")).toBe("n1");
  });

  it("renders no alert before the first submission", () => {
    render(
      <ActionForm action={async () => ({})}>
        <SubmitButton>Enviar</SubmitButton>
      </ActionForm>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
