import { test, expect } from "@playwright/test";
import { confirmAction, login, toast, formAlert } from "./helpers";

test.describe("Customers", () => {
  test("create, edit, archive and unarchive a customer", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    const name = `Cliente E2E ${Date.now() % 100000}`;

    await page.goto("/clientes/novo");
    await page.getByLabel("Nome").fill(name);
    await page.getByLabel("Email").fill("e2e@cliente.com");
    await page.getByRole("button", { name: /salvar cliente/i }).click();
    await expect(page).toHaveURL(/\/clientes(\?|$)/);
    await expect(toast(page).filter({ hasText: /cliente cadastrado/i })).toBeVisible();

    await page.getByRole("link", { name }).click();
    await page.getByRole("link", { name: /editar/i }).click();
    await page.getByLabel("Nome").fill(`${name} (editado)`);
    await page.getByRole("button", { name: /salvar alterações/i }).click();
    await expect(toast(page).filter({ hasText: /cliente atualizado/i })).toBeVisible();

    // VES-93: archiving asks first — "Voltar" leaves the customer as it was.
    await page.getByRole("button", { name: "Arquivar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Arquivar este cliente?" });
    await expect(dialog).toContainText(/histórico de compras fica guardado/);
    await dialog.getByRole("button", { name: "Voltar" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/cliente arquivado — não aparece/i)).toHaveCount(0);

    await confirmAction(page, "Arquivar", "Arquivar cliente");
    await expect(page).toHaveURL(/\/clientes(\?|$)/);
    await expect(toast(page).filter({ hasText: /cliente arquivado/i })).toBeVisible();

    await page.goto("/clientes?scope=archived");
    await page.getByRole("link", { name: `${name} (editado)` }).click();
    await page.getByRole("button", { name: "Desarquivar" }).click();
    await expect(toast(page).filter({ hasText: /cliente reativado/i })).toBeVisible();
  });

  test("rejects an invalid CPF", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/clientes/novo");
    await page.getByLabel("Nome").fill("CPF Ruim");
    await page.getByLabel("CPF").fill("123.456.789-00");
    await page.getByRole("button", { name: /salvar cliente/i }).click();
    await expect(formAlert(page)).toHaveText(/cpf inválido/i);
  });

  test("masks the phone and rejects one without DDD (VES-80)", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/clientes/novo");
    await page.getByLabel("Nome").fill("Telefone Curto");
    const phone = page.getByLabel("Telefone");
    await phone.pressSequentially("abc11987654321");
    await expect(phone).toHaveValue("(11) 98765-4321");
    await phone.fill("");
    await phone.pressSequentially("98765");
    await page.getByRole("button", { name: /salvar cliente/i }).click();
    await expect(formAlert(page)).toHaveText(/telefone inválido/i);
    await expect(phone).toHaveAttribute("aria-invalid", "true");
  });
});
