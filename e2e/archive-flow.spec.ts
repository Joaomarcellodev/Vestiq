import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email profissional").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("archive then unarchive a product", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");

  await page.goto("/produtos");
  await page.getByRole("link", { name: /T-Shirt Gucci/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);

  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page).toHaveURL(/\/produtos$/);

  // now visible under "Arquivados"
  await page.getByRole("link", { name: "Arquivados" }).click();
  await expect(page.getByText(/T-Shirt Gucci/i)).toBeVisible();

  await page.getByRole("button", { name: "Desarquivar" }).first().click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Arquivar" })).toBeVisible();
});

test("factory admin can disable and re-enable a reseller (pt-BR labels)", async ({ page }) => {
  await login(page, "fabrica@vestiq.dev");

  await page.goto("/rede-fabrica");
  await expect(page.getByRole("heading", { name: /rede da fábrica/i })).toBeVisible();

  const row = page.locator("li", { hasText: "Clara Boutique" });
  await expect(row.getByText("Ativa", { exact: true })).toBeVisible();

  const toggle = row.getByRole("switch");
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  await toggle.click();
  await expect(row.getByText("Desativada", { exact: true })).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await toggle.click();
  await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
});
