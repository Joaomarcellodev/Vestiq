import { test, expect } from "@playwright/test";
import { login, toast } from "./helpers";

// VES-105 — the seller says why she turns the proposal down; the buyer reads it in the chat.
test("the reason given when rejecting reaches the buyer", async ({ browser }) => {
  const buyerCtx = await browser.newContext();
  const sellerCtx = await browser.newContext();
  const buyer = await buyerCtx.newPage();
  const seller = await sellerCtx.newPage();
  await login(buyer, "revenda2@vestiq.dev");
  await login(seller, "revenda@vestiq.dev");

  await buyer.goto("/rede");
  await buyer
    .locator("li", { has: buyer.getByText("Atelier Sarah") })
    .filter({ hasNot: buyer.getByText("Sua oferta") })
    .getByRole("link", { name: /ver detalhes/i })
    .first()
    .click();
  await buyer.getByLabel(/quantidade/i).fill("1");
  await buyer.getByLabel(/valor proposto/i).fill("10");
  await buyer.getByRole("button", { name: /enviar proposta/i }).click();
  await expect(buyer).toHaveURL(/\/negociacoes\/[0-9a-f-]{36}/);
  const negPath = new URL(buyer.url()).pathname;
  // The buyer can't reject, so the field is only on the seller's side.
  await expect(buyer.getByLabel("Motivo da recusa (opcional)")).toHaveCount(0);

  const reason = `Valor abaixo do mínimo (${Date.now()})`;
  await seller.goto(negPath);
  await seller.getByLabel("Motivo da recusa (opcional)").fill(reason);
  await seller.getByRole("button", { name: "Recusar" }).click();
  await expect(toast(seller)).toHaveText(/proposta recusada/i);
  await expect(seller.getByLabel("Motivo da recusa (opcional)")).toHaveCount(0);

  await buyer.goto(negPath);
  await expect(buyer.getByText("Recusada", { exact: true })).toBeVisible();
  await expect(buyer.getByText(reason)).toBeVisible();

  await buyerCtx.close();
  await sellerCtx.close();
});
