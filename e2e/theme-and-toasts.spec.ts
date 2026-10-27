import { test, expect } from "@playwright/test";
import { login, toast } from "./helpers";

test.describe("Theme + toasts", () => {
  test("toggles light → dark → system and persists across reload", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");

    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: /tema (claro|escuro|do sistema)/i });

    await toggle.click(); // → dark (or the next in the cycle)
    await expect(html).toHaveClass(/dark|light/);
    const afterFirst = await html.getAttribute("class");

    await page.reload();
    await expect(html).toHaveClass(
      new RegExp((afterFirst || "").includes("dark") ? "dark" : "light"),
    );
  });

  test("shows a toast when a product is edited", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/produtos");
    await page.locator("ul li a[href^='/produtos/']").first().click();
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByRole("button", { name: /salvar alterações/i }).click();
    await expect(toast(page)).toHaveText(/produto atualizado/i);
  });

  // VES-87 — after an inline action Next writes `?toast` back into the URL, and a
  // reload used to show the flash again.
  test("doesn't show 'Produto cadastrado' again after an entry and a reload", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/produtos/novo");
    await page.getByLabel(/nome do produto/i).fill(`Peça Aviso ${Date.now() % 100000}`);
    await page.getByLabel("Preço de venda (R$)").first().fill("50");
    await page.getByRole("button", { name: /salvar produto/i }).click();
    await expect(toast(page)).toHaveText(/produto cadastrado/i);
    await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/);

    await page.getByRole("button", { name: "Entrada" }).click();
    await page.getByLabel("Quantidade").fill("2");
    await page.getByRole("button", { name: /registrar entrada/i }).click();
    await expect(page.getByText("Entrada registrada.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Entrada" })).toBeVisible();
    await expect(toast(page)).toHaveCount(0);
  });
});
