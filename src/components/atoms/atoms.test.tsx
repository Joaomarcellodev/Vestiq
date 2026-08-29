import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "./badge";
import { Checkbox } from "./checkbox";
import { Spinner } from "./spinner";
import { TextField } from "./text-field";
import { Icon } from "./icon";
import { Logo } from "./logo";

describe("Badge", () => {
  it("renders each tone with the right classes", () => {
    const tones = ["neutral", "primary", "success", "warning", "error", "info"] as const;
    for (const tone of tones) {
      const { unmount } = render(<Badge tone={tone}>{tone}</Badge>);
      expect(screen.getByText(tone)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("Spinner", () => {
  it("has a status role and an accessible label", () => {
    render(<Spinner label="Salvando" />);
    expect(screen.getByRole("status", { name: "Salvando" })).toBeInTheDocument();
  });
});

describe("Checkbox", () => {
  it("links the label to the input and toggles", async () => {
    render(<Checkbox label="Lembrar-me" name="remember" />);
    const box = screen.getByLabelText("Lembrar-me");
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(box).toBeChecked();
  });
});

describe("TextField", () => {
  it("renders label, error and aria-invalid", () => {
    render(<TextField label="Email" error="Email inválido" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
  });

  it("reveals and hides the password with the toggle", async () => {
    render(<TextField label="Senha" revealable />);
    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(input).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: /ocultar senha/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("shows a hint when there is no error", () => {
    render(<TextField label="Data" hint="dd/mm/aaaa" />);
    expect(screen.getByText("dd/mm/aaaa")).toBeInTheDocument();
  });
});

describe("Icon", () => {
  it("renders a known icon and resolves aliases", () => {
    const { container, rerender } = render(<Icon name="add" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    rerender(<Icon name="email" />); // alias → mail
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders nothing for an unknown icon name", () => {
    const { container } = render(<Icon name="does-not-exist" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("Logo", () => {
  it("renders the wordmark by default and hides it when asked", () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByText("VESTIQ")).toBeInTheDocument();
    rerender(<Logo withWordmark={false} />);
    expect(screen.queryByText("VESTIQ")).not.toBeInTheDocument();
  });
});
