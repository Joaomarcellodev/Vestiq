import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// SPEC-011 TC-SUP-11 — relies on the demo factory catalog from scripts/seed.mjs.
test("a reseller searches suppliers and products to restock", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");
  await page.goto("/fornecedores");

  // Product search across every supplier.
  await page.getByRole("searchbox").fill("vestido preto");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/q=vestido\+preto/);
  const card = page.getByRole("link", { name: /Vestido Midi Canelado/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Fábrica Modah");
  await expect(card).toContainText("Pedido mínimo: 12 peças");
  await expect(page.getByRole("link", { name: /Calça Wide Leg/ })).toHaveCount(0);

  // Product detail: wholesale conditions and variants, never cost.
  await card.click();
  await expect(page.getByRole("heading", { name: "Vestido Midi Canelado" })).toBeVisible();
  await expect(page.getByText("Condições de atacado")).toBeVisible();
  await expect(page.getByText("Preto / P")).toBeVisible();
  await expect(page.getByText(/margem/i)).toHaveCount(0);

  // Supplier catalog, searchable on its own.
  await page.getByRole("link", { name: "Fábrica Modah" }).click();
  await expect(page.getByRole("heading", { name: "Fábrica Modah" })).toBeVisible();
  await page.getByRole("searchbox").fill("calça");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("link", { name: /Calça Wide Leg Alfaiataria/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Vestido Midi Canelado/ })).toHaveCount(0);
});

test("the supplier tab filters suppliers by name", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");
  await page.goto("/fornecedores?view=fornecedores&q=modah");
  await expect(page.getByRole("link", { name: /Fábrica Modah/ })).toBeVisible();

  await page.goto("/fornecedores?view=fornecedores&q=inexistente");
  await expect(page.getByText("Nenhum fornecedor encontrado")).toBeVisible();
});

test("a product outside the reseller's networks is not found", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");
  // The (app) loading.tsx streams the response, so the status is already 200
  // when notFound() runs — assert on the rendered not-found page instead.
  await page.goto("/fornecedores/produtos/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText(/could not be found/i)).toBeVisible();
});
