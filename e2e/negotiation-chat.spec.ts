import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// ADR-0010 / TC-NEG-16, TC-NEG-19 — two live sessions on the same negotiation.

/** A marker on `window` survives client-side updates but not a full page load. */
async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
}
async function expectNoReload(page: Page) {
  expect(
    await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
  ).toBe(true);
}

test("messages and status changes reach the other party without reloading", async ({ browser }) => {
  const sellerCtx = await browser.newContext();
  const buyerCtx = await browser.newContext();
  const seller = await sellerCtx.newPage();
  const buyer = await buyerCtx.newPage();
  await login(seller, "revenda@vestiq.dev");
  await login(buyer, "revenda2@vestiq.dev");

  // Buyer proposes on one of the seller's offers.
  await buyer.goto("/rede");
  await buyer
    .locator("li", { has: buyer.getByText("Atelier Sarah") })
    .filter({ hasNot: buyer.getByText("Sua oferta") })
    .getByRole("link", { name: /ver detalhes/i })
    .first()
    .click();
  await buyer.getByLabel(/quantidade/i).fill("1");
  await buyer.getByLabel(/valor proposto/i).fill("150");
  await buyer.getByRole("button", { name: /enviar proposta/i }).click();
  await expect(buyer).toHaveURL(/\/negociacoes\/[0-9a-f-]{36}/);
  const negPath = new URL(buyer.url()).pathname;

  await seller.goto(negPath);
  for (const page of [seller, buyer]) {
    await expect(page.getByText("Ao vivo")).toBeVisible({ timeout: 15_000 });
    await markPage(page);
  }

  // Seller → buyer
  const hello = `Consigo entregar sexta (${Date.now()})`;
  await seller.getByLabel("Mensagem", { exact: true }).fill(hello);
  await seller.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(seller.getByText(hello)).toBeVisible();
  await expect(buyer.getByText(hello)).toBeVisible({ timeout: 10_000 });

  // Buyer → seller, sent with Enter
  const reply = `Fechado! (${Date.now()})`;
  await buyer.getByLabel("Mensagem", { exact: true }).fill(reply);
  await buyer.getByLabel("Mensagem", { exact: true }).press("Enter");
  await expect(seller.getByText(reply)).toBeVisible({ timeout: 10_000 });

  // Seller accepts → the buyer's status updates live
  await seller.getByRole("button", { name: "Aceitar" }).click();
  await expect(buyer.getByText("Aceita", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(buyer.getByText(/Proposta aceita · Atelier Sarah/)).toBeVisible();

  await expectNoReload(buyer);

  // Buyer cancels → the chat closes for the seller too
  await buyer.getByRole("button", { name: "Cancelar" }).click();
  await expect(seller.getByText("Negociação encerrada. O chat está fechado.")).toBeVisible({
    timeout: 10_000,
  });

  await sellerCtx.close();
  await buyerCtx.close();
});
