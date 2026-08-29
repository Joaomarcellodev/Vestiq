import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setPathname } from "@/test/next";
import { AppShell } from "./app-shell";
import { TopAppBar } from "@/components/organisms/top-app-bar";

describe("AppShell", () => {
  it("renders the nav chrome, the content and the notification bell", () => {
    setPathname("/dashboard");
    render(
      <AppShell role="RESELLER" orgName="Loja" userName="Ana" unreadCount={3} notifications={[]}>
        <p>conteúdo</p>
      </AppShell>,
    );
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegação principal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3 não lidas/i })).toBeInTheDocument();
  });
});

describe("TopAppBar", () => {
  it("carries the theme toggle, the bell and the profile link", () => {
    setPathname("/produtos");
    render(<TopAppBar userName="Ana" unreadCount={0} notifications={[]} />);
    expect(screen.getByRole("button", { name: /tema/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notificações/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /meu perfil/i })).toHaveAttribute("href", "/perfil");
  });
});
