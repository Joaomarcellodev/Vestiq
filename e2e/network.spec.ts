import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// These share the three demo accounts and mutate network state — keep serial.
test.describe.configure({ mode: "serial" });

async function publishOffer(page: import("@playwright/test").Page, price: string) {
  await page.goto("/rede/publicar");
  await page.locator("select[name=variantId]").selectOption({ index: 0 });
  await page.locator("select[name=networkId]").selectOption({ index: 0 });
  await page.getByLabel(/quantidade ofertada/i).fill("2");
  await page.getByLabel(/preço de transferência/i).fill(price);
  await page.getByRole("button", { name: /publicar na rede/i }).click();
  await expect(page).toHaveURL(/\/rede(\?|$)/);
}

test("publishing an offer notifies the other reseller in the network", async ({ browser }) => {
  const sellerCtx = await browser.newContext();
  const buyerCtx = await browser.newContext();
  const seller = await sellerCtx.newPage();
  const buyer = await buyerCtx.newPage();
  await login(seller, "revenda@vestiq.dev");
  await login(buyer, "revenda2@vestiq.dev");

  await publishOffer(seller, "97");

  // second offer so there are two unread → "marcar todas" is available
  await publishOffer(seller, "98");

  await buyer.goto("/dashboard");
  const bell = buyer.getByRole("button", { name: /notificações/i });
  await expect(bell).toHaveText(/[2-9]/, { timeout: 15_000 });
  await bell.click();
  await expect(buyer.getByText("Nova oferta na rede").first()).toBeVisible();

  await buyer.getByRole("button", { name: /marcar todas como lidas/i }).click();
  await expect(bell).not.toHaveText(/[1-9]/);

  // the panel stays open — follow one notification through to its offer
  await buyer.getByText("Nova oferta na rede").first().click();
  await expect(buyer).toHaveURL(/\/rede\/ofertas\//);

  await sellerCtx.close();
  await buyerCtx.close();
});

test("offer → negotiation → accept → complete transfer", async ({ browser }) => {
  const sellerCtx = await browser.newContext();
  const buyerCtx = await browser.newContext();
  const seller = await sellerCtx.newPage();
  const buyer = await buyerCtx.newPage();
  await login(seller, "revenda@vestiq.dev");
  await login(buyer, "revenda2@vestiq.dev");

  await publishOffer(seller, "155");

  await buyer.goto("/rede");
  await buyer
    .getByRole("link", { name: /ver detalhes/i })
    .first()
    .click();
  await buyer.getByLabel(/quantidade/i).fill("1");
  await buyer.getByLabel(/valor proposto/i).fill("160");
  await buyer.getByRole("button", { name: /enviar proposta/i }).click();
  await expect(buyer).toHaveURL(/\/negociacoes\/[0-9a-f-]{36}/);
  const negUrl = new URL(buyer.url()).pathname;

  await seller.goto(negUrl);
  await expect(seller.getByText("Pendente")).toBeVisible();
  await expect(async () => {
    await seller.getByRole("button", { name: "Aceitar" }).click();
    await expect(seller.getByText("Aceita", { exact: true })).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 15_000 });
  await expect(async () => {
    await seller.getByRole("button", { name: /concluir transfer/i }).click();
    await expect(seller.getByText("Concluída", { exact: true })).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 15_000 });

  await sellerCtx.close();
  await buyerCtx.close();
});

test("factory admin toggles a member with the on/off switch", async ({ page }) => {
  await login(page, "fabrica@vestiq.dev");
  await page.goto("/rede-fabrica");

  const row = page.locator("li", { hasText: "Clara Boutique" });
  const toggle = row.getByRole("switch");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(row.getByText("Desativada", { exact: true })).toBeVisible();
  await toggle.click();
  await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
});
