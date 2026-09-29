import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// ADR-0011 / TC-NOTIF-07 — the bell updates live across two sessions.

async function unreadCount(page: Page): Promise<number> {
  const label =
    (await page.getByRole("button", { name: /^notificações/i }).getAttribute("aria-label")) ?? "";
  return Number(/\((\d+) não lidas\)/.exec(label)?.[1] ?? 0);
}

test("a new proposal reaches the seller's bell without reloading", async ({ browser }) => {
  const sellerCtx = await browser.newContext();
  const buyerCtx = await browser.newContext();
  const seller = await sellerCtx.newPage();
  const buyer = await buyerCtx.newPage();
  await login(seller, "revenda@vestiq.dev");
  await login(buyer, "revenda2@vestiq.dev");

  // Seller waits on the dashboard; a marker on `window` proves no reload happened.
  const before = await unreadCount(seller);
  await seller.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

  // Buyer proposes on one of the seller's offers.
  await buyer.goto("/rede");
  await buyer
    .locator("li", { has: buyer.getByText("Atelier Sarah") })
    .filter({ hasNot: buyer.getByText("Sua oferta") })
    .getByRole("link", { name: /ver detalhes/i })
    .first()
    .click();
  await buyer.getByLabel(/quantidade/i).fill("1");
  await buyer.getByLabel(/valor proposto/i).fill("140");
  await buyer.getByRole("button", { name: /enviar proposta/i }).click();
  await expect(buyer).toHaveURL(/\/negociacoes\/[0-9a-f-]{36}/);

  // Well under the 60 s fallback poll.
  await expect.poll(() => unreadCount(seller), { timeout: 10_000 }).toBeGreaterThan(before);
  await seller.getByRole("button", { name: /^notificações/i }).click();
  await expect(seller.getByText("Nova proposta recebida").first()).toBeVisible();
  await expect(seller).toHaveTitle(/^\(\d+\+?\) /);
  expect(
    await seller.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
  ).toBe(true);

  await sellerCtx.close();
  await buyerCtx.close();
});
