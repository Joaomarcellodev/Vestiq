import { test, expect } from "@playwright/test";
import { login, toast, formAlert } from "./helpers";

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
  });

  test("rejects an invalid CPF", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/clientes/novo");
    await page.getByLabel("Nome").fill("CPF Ruim");
    await page.getByLabel("CPF").fill("123.456.789-00");
    await page.getByRole("button", { name: /salvar cliente/i }).click();
    await expect(formAlert(page)).toHaveText(/cpf inválido/i);
  });
});
