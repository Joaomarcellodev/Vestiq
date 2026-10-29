import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const updateOrganizationCity = vi.fn();
const toast = vi.fn();
vi.mock("../actions", () => ({
  updateOrganizationCity: (p: unknown, fd: FormData) => updateOrganizationCity(p, fd),
}));
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { OrganizationCityForm } = await import("./organization-city-form");

describe("OrganizationCityForm (VES-65)", () => {
  it("prefills the city, links the public profile and toasts on save", async () => {
    updateOrganizationCity.mockResolvedValueOnce({ ok: "Cidade da loja atualizada." });
    render(
      <OrganizationCityForm
        orgName="Atelier Sarah"
        city="Teresina, PI"
        profileHref="/rede/revendedoras/o1"
      />,
    );
    expect(screen.getByRole("link", { name: "Ver meu perfil público" })).toHaveAttribute(
      "href",
      "/rede/revendedoras/o1",
    );
    const field = screen.getByLabelText("Cidade");
    expect(field).toHaveValue("Teresina, PI");

    await userEvent.clear(field);
    await userEvent.type(field, "Parnaíba, PI");
    await userEvent.click(screen.getByRole("button", { name: "Salvar cidade" }));

    const fd = updateOrganizationCity.mock.calls.at(-1)![1] as FormData;
    expect(fd.get("city")).toBe("Parnaíba, PI");
    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        message: "Cidade da loja atualizada.",
        variant: "success",
      }),
    );
  });

  it("shows the error and no profile link when there is none", async () => {
    updateOrganizationCity.mockResolvedValueOnce({
      error: "Use no máximo 80 caracteres na cidade",
    });
    render(<OrganizationCityForm orgName="Loja" city={null} />);
    expect(screen.queryByRole("link")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Salvar cidade" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Use no máximo 80 caracteres na cidade",
    );
  });
});
