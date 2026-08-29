import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./switch";

describe("Switch", () => {
  it("exposes role=switch with the checked state and label", () => {
    render(<Switch label="Ativa" checked />);
    const el = screen.getByRole("switch", { name: "Ativa" });
    expect(el).toHaveAttribute("aria-checked", "true");
  });

  it("toggles via click and keyboard", async () => {
    const onChange = vi.fn();
    render(<Switch label="Toggle" checked={false} onChange={onChange} />);
    const el = screen.getByRole("switch");
    await userEvent.click(el);
    expect(onChange).toHaveBeenLastCalledWith(true);
    el.focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does not fire when disabled or loading", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Switch label="X" checked={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("switch"));
    rerender(<Switch label="X" checked={false} onChange={onChange} loading />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("shows a spinner in the knob while loading", () => {
    render(<Switch label="X" checked loading />);
    expect(screen.getByRole("status", { name: /carregando/i })).toBeInTheDocument();
  });

  it("renders visible children next to the track", () => {
    render(
      <Switch label="X" checked={false}>
        Ativo
      </Switch>,
    );
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });
});
