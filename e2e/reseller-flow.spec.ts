import { test, expect } from "@playwright/test";

const RESELLER = { email: "revenda@vestiq.dev", password: "vestiq123" };

test.describe("Reseller core flow", () => {
  test("login redirects to the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email profissional").fill(RESELLER.email);
    await page.getByLabel("Senha", { exact: true }).fill(RESELLER.password);
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /bom dia/i })).toBeVisible();
  });

  test("protected route redirects to login when signed out", async ({ page }) => {
    await page.goto("/vendas");
    await expect(page).toHaveURL(/\/login\?next=%2Fvendas/);
  });

  test("registers a sale and sees it in the sales list", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email profissional").fill(RESELLER.email);
    await page.getByLabel("Senha", { exact: true }).fill(RESELLER.password);
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/vendas/nova");
    await page.getByPlaceholder("Buscar produto no estoque...").fill("Chanel");
    await page
      .getByRole("button", { name: /Bolsa Chanel/i })
      .first()
      .click();
    await page.getByRole("button", { name: /confirmar venda/i }).click();

    await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}/);
    await expect(page.getByText(/venda avulsa/i)).toBeVisible();
  });
});
