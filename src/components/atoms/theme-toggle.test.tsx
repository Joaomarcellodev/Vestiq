import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";
import { THEME_COOKIE } from "@/lib/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts from the persisted preference", async () => {
    document.cookie = `${THEME_COOKIE}=dark; path=/`;
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: /tema escuro/i })).toBeInTheDocument();
  });

  it("cycles light → dark → system, persisting each step and updating <html>", async () => {
    document.cookie = `${THEME_COOKIE}=light; path=/`;
    render(<ThemeToggle />);

    const btn = await screen.findByRole("button", { name: /tema claro/i });
    await userEvent.click(btn);
    expect(document.cookie).toContain(`${THEME_COOKIE}=dark`);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /tema escuro/i }));
    expect(document.cookie).toContain(`${THEME_COOKIE}=system`);

    await userEvent.click(screen.getByRole("button", { name: /tema do sistema/i }));
    expect(document.cookie).toContain(`${THEME_COOKIE}=light`);
  });

  it("renders a labelled row in the button variant", async () => {
    render(<ThemeToggle variant="button" />);
    expect(await screen.findByText(/tema do sistema/i)).toBeInTheDocument();
    expect(screen.getByText("Trocar")).toBeInTheDocument();
  });
});
