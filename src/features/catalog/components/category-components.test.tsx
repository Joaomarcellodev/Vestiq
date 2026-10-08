import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createCategory = vi.fn();
const renameCategory = vi.fn();
const setCategoryArchived = vi.fn().mockResolvedValue({ ok: true });

vi.mock("../actions", () => ({
  createCategory: (p: unknown, fd: FormData) => createCategory(p, fd),
  renameCategory: (p: unknown, fd: FormData) => renameCategory(p, fd),
  setCategoryArchived: (p: unknown, fd: FormData) => setCategoryArchived(p, fd),
}));

const { CategoryField } = await import("./category-field");
const { CategoryManager } = await import("./category-manager");
const { ToastProvider } = await import("@/components/organisms/toast/toast-provider");

const CATS = [{ id: "c1", name: "Bolsas" }];

describe("CategoryField (TC-PROD-18)", () => {
  it("creates a category in place and selects it", async () => {
    createCategory.mockResolvedValueOnce({ ok: true, category: { id: "c2", name: "Acessórios" } });
    render(<CategoryField categories={CATS} emptyLabel="Sem categoria" />);

    await userEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    await userEvent.type(screen.getByLabelText("Nome da nova categoria"), "Acessórios");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    const select = await screen.findByLabelText("Categoria");
    expect(select).toHaveValue("c2");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Sem categoria", "Acessórios", "Bolsas"]);
    expect((createCategory.mock.calls[0]![1] as FormData).get("name")).toBe("Acessórios");
  });

  it("shows the error and keeps the name when the category already exists", async () => {
    createCategory.mockResolvedValueOnce({ error: "Já existe uma categoria com esse nome" });
    render(<CategoryField categories={CATS} emptyLabel="Sem categoria" defaultValue="c1" />);

    await userEvent.click(screen.getByRole("button", { name: "Nova categoria" }));
    await userEvent.type(screen.getByLabelText("Nome da nova categoria"), "Bolsas{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe");
    expect(screen.getByLabelText("Nome da nova categoria")).toHaveValue("Bolsas");
    expect(screen.getByLabelText("Categoria")).toHaveValue("c1");
  });
});

describe("CategoryManager", () => {
  const list = [
    { id: "c1", name: "Bolsas", archived: false, productCount: 2 },
    { id: "c2", name: "Inverno", archived: true, productCount: 1 },
  ];

  it("splits active and archived categories and archives one", async () => {
    render(
      <ToastProvider>
        <CategoryManager categories={list} />
      </ToastProvider>,
    );
    expect(screen.getByText("Ativas (1)")).toBeInTheDocument();
    expect(screen.getByText("Arquivadas (1)")).toBeInTheDocument();
    expect(screen.getByText("2 produtos")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Arquivar Bolsas" }));
    const fd = setCategoryArchived.mock.calls.at(-1)![1] as FormData;
    expect(fd.get("id")).toBe("c1");
    expect(fd.get("archived")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: "Reativar Inverno" }));
    expect((setCategoryArchived.mock.calls.at(-1)![1] as FormData).get("archived")).toBe("false");
  });

  it("renames inline and shows the duplicate-name error on the field", async () => {
    renameCategory.mockResolvedValueOnce({ error: "Já existe uma categoria com esse nome" });
    render(
      <ToastProvider>
        <CategoryManager categories={list} />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Renomear Bolsas" }));
    const input = screen.getByLabelText('Renomear "Bolsas"');
    await userEvent.clear(input);
    await userEvent.type(input, "Inverno");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Já existe uma categoria com esse nome")).toBeInTheDocument();
    const fd = renameCategory.mock.calls[0]![1] as FormData;
    expect([fd.get("id"), fd.get("name")]).toEqual(["c1", "Inverno"]);
  });
});
