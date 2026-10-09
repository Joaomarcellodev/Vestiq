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

// VES-107 TC-PROD-21 — the factory's photos are what resellers see.
test("a photo the factory uploads shows up for the reseller in Fornecedores", async ({
  page,
  browser,
}) => {
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  const name = `Peça Fábrica ${Date.now() % 100000}`;

  await login(page, "fabrica@vestiq.dev");
  await page.goto("/produtos/novo");
  await page.getByLabel(/nome do produto/i).fill(name);
  await page.getByLabel("Preço de venda (R$)").fill("90");
  await expect(page.getByText(/aparecem para as revendedoras em Fornecedores/)).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByText("Capa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /salvar produto/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/);

  const reseller = await (await browser.newContext()).newPage();
  await login(reseller, "revenda@vestiq.dev");
  await reseller.goto(`/fornecedores?q=${encodeURIComponent(name)}`);
  const card = reseller.getByRole("link", { name: new RegExp(name) });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toBeVisible();

  // Keep the demo catalog clean: archived products leave Fornecedores.
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("Produto arquivado.")).toBeVisible();
});
