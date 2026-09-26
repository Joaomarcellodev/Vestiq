import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// SPEC-012 TC-ORD-12 — relies on the demo factory catalog from scripts/seed.mjs.
test("a reseller orders from a supplier and the factory confirms", async ({ browser }) => {
  const resellerCtx = await browser.newContext();
  const factoryCtx = await browser.newContext();
  const reseller = await resellerCtx.newPage();
  const factory = await factoryCtx.newPage();
  await login(reseller, "revenda@vestiq.dev");
  await login(factory, "fabrica@vestiq.dev");

  // Reseller: supplier product → order form.
  await reseller.goto("/fornecedores?q=vestido%20midi%20canelado");
  await reseller.getByRole("link", { name: /Vestido Midi Canelado/ }).click();
  await reseller.getByRole("link", { name: "Fazer pedido" }).click();
  await expect(reseller.getByRole("heading", { name: "Pedido de abastecimento" })).toBeVisible();

  const send = reseller.getByRole("button", { name: "Enviar pedido" });
  await reseller.getByLabel("Vestido Midi Canelado Preto P", { exact: true }).fill("6");
  await reseller.getByLabel("Vestido Midi Canelado Preto M", { exact: true }).fill("4");
  await expect(reseller.getByText("Faltam 2 peças para o mínimo", { exact: true })).toBeVisible();
  await expect(send).toBeDisabled();
  await reseller.getByLabel("Vestido Midi Canelado Preto G", { exact: true }).fill("2");
  const note = `E2E ${Date.now()}`;
  await reseller.getByLabel("Observação para o fornecedor (opcional)").fill(note);
  await expect(send).toBeEnabled();
  await send.click();

  await expect(reseller).toHaveURL(/\/pedidos\/[0-9a-f-]{36}/);
  await expect(reseller.getByText("Pedido enviado ao fornecedor.")).toBeVisible();
  await expect(reseller.getByText("Pendente", { exact: true })).toBeVisible();
  await expect(reseller.getByText(note)).toBeVisible();
  const orderPath = new URL(reseller.url()).pathname;

  // Factory: the order is in the received list and can be confirmed.
  await factory.goto("/pedidos?status=pendentes");
  await factory.locator(`a[href="${orderPath}"]`).click();
  await expect(factory.getByText("De Atelier Sarah")).toBeVisible();
  await factory.getByLabel("Mensagem para a revendedora (opcional)").fill("Sai na segunda.");
  await factory.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(factory.getByText("Pedido confirmado.")).toBeVisible();
  await expect(factory.getByText("Confirmado", { exact: true })).toBeVisible();

  // Reseller sees the answer; nothing left to cancel.
  await reseller.goto(orderPath);
  await expect(reseller.getByText("Confirmado", { exact: true })).toBeVisible();
  await expect(reseller.getByText("Sai na segunda.")).toBeVisible();
  await expect(reseller.getByRole("button", { name: "Cancelar pedido" })).toHaveCount(0);

  await resellerCtx.close();
  await factoryCtx.close();
});

test("a reseller cancels a pending order", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");
  await page.goto("/fornecedores?view=fornecedores&q=modah");
  await page.getByRole("link", { name: /Fábrica Modah/ }).click();
  await page.getByRole("link", { name: "Fazer pedido" }).click();
  for (const size of ["36", "38", "40"]) {
    await page.getByLabel(`Calça Wide Leg Alfaiataria Bege ${size}`, { exact: true }).fill("2");
  }
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page).toHaveURL(/\/pedidos\/[0-9a-f-]{36}/);

  await page.getByLabel("Motivo do cancelamento (opcional)").fill("Pedi a cor errada");
  await page.getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(page.getByText("Pedido cancelado.")).toBeVisible();
  await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
  await expect(page.getByText("Pedi a cor errada")).toBeVisible();
});
