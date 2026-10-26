import { test, expect } from "@playwright/test";

const RESELLER = { email: "revenda@vestiq.dev", password: "vestiq123" };

test.describe("Reseller core flow", () => {
  test("login redirects to the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email profissional").fill(RESELLER.email);
    await page.getByLabel("Senha", { exact: true }).fill(RESELLER.password);
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /bom dia|boa tarde|boa noite/i })).toBeVisible();
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

  test("the sale detail explains the discount and, once cancelled, why, when and by whom (VES-82, VES-83)", async ({
    page,
  }) => {
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
    await page.getByLabel("Desconto (R$)").fill("100");
    await page.getByRole("button", { name: /confirmar venda/i }).click();
    await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}/);

    const main = page.locator("main");
    await expect(main.getByText("Subtotal").locator("..")).toContainText("R$ 35.000,00");
    await expect(main.getByText("Desconto").locator("..")).toContainText("− R$ 100,00");
    await expect(main.getByText(/^Total ·/).locator("..")).toContainText("R$ 34.900,00");

    await page.getByPlaceholder("Motivo do cancelamento").fill("Cliente desistiu na entrega");
    await page.getByRole("button", { name: /cancelar e estornar estoque/i }).click();

    const cancellation = page.getByRole("region", { name: "Cancelamento" });
    await expect(cancellation).toContainText("Cliente desistiu na entrega");
    await expect(cancellation).toContainText(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
    await expect(cancellation).toContainText("Sarah Mendes");
  });
});
