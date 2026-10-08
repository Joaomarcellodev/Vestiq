import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// SPEC-005 US-INV-03 — "entender como cheguei no saldo".
test("a variant's history explains its balance, newest first", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");
  const main = page.getByRole("main");
  await page.goto("/produtos/novo");
  const name = `Peça Histórico ${Date.now() % 100000}`;
  await page.getByLabel(/nome do produto/i).fill(name);
  await page.getByLabel("Estoque inicial").first().fill("20");
  await page.getByLabel("Preço de venda (R$)").first().fill("90");
  await page.getByRole("button", { name: /salvar produto/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Ajuste" }).click();
  await page.getByLabel("Ajuste (+/-)").fill("-1");
  await page.getByLabel("Motivo").fill("peça manchada");
  await page.getByRole("button", { name: /aplicar ajuste/i }).click();
  await expect(page.getByText("Ajuste registrado.")).toBeVisible();

  await main.getByRole("link", { name: "Histórico" }).click();
  await expect(page).toHaveURL(/\/variantes\/[0-9a-f-]{36}\/historico$/);
  await expect(page.getByRole("heading", { name: "Histórico de estoque" })).toBeVisible();
  await expect(page.getByText("19 em estoque")).toBeVisible();

  const rows = main.locator("ul li");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Ajuste");
  await expect(rows.nth(0)).toContainText("peça manchada");
  await expect(rows.nth(0)).toContainText("-1");
  await expect(rows.nth(0)).toContainText("saldo 19");
  await expect(rows.nth(1)).toContainText("Entrada");
  await expect(rows.nth(1)).toContainText("Estoque inicial");
  await expect(rows.nth(1)).toContainText("+20");
  await expect(rows.nth(1)).toContainText("saldo 20");

  await main.getByRole("link", { name: "Ajustes", exact: true }).click();
  await expect(page).toHaveURL(/tipo=adjust/);
  await expect(rows).toHaveCount(1);

  await main.getByRole("link", { name: "Vendas", exact: true }).click();
  await expect(page.getByText("Nenhuma movimentação deste tipo nesta variação.")).toBeVisible();
});
