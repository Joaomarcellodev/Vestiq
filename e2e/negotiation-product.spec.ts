import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// VES-97 — the buyer sees the product she is negotiating, not "—".
test("the buyer sees the negotiated product in the list and the detail", async ({ page }) => {
  await login(page, "revenda2@vestiq.dev");

  await page.goto("/rede");
  await page
    .locator("li", { has: page.getByText("Atelier Sarah") })
    .filter({ hasNot: page.getByText("Sua oferta") })
    .getByRole("link", { name: /ver detalhes/i })
    .first()
    .click();
  // Read the title only once the offer page replaced the feed's "Rede de oportunidades".
  await expect(page).toHaveURL(/\/rede\/ofertas\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Rede de oportunidades");
  const productName = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await page.getByLabel(/quantidade/i).fill("1");
  await page.getByLabel(/valor proposto/i).fill("150");
  await page.getByRole("button", { name: /enviar proposta/i }).click();
  await expect(page).toHaveURL(/\/negociacoes\/[0-9a-f-]{36}/);
  const negPath = new URL(page.url()).pathname;

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(productName);

  // VES-90: sent negotiations are their own tab.
  await page.goto("/negociacoes?tipo=enviadas");
  await expect(page.locator(`a[href="${negPath}"]`)).toContainText(productName);

  // Leave the demo data as it was.
  await page.goto(negPath);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
});
