import { test, expect } from "@playwright/test";
import { login, toast } from "./helpers";

// VES-88 — the factory resends or cancels an invite nobody accepted yet.

test("factory resends, then cancels a pending invite", async ({ page }) => {
  const email = `e2e-gerir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@vestiq.test`;
  await login(page, "fabrica@vestiq.dev");
  await page.goto("/rede-fabrica");
  await page.getByLabel("Email da revendedora").fill(email);
  await page.getByRole("button", { name: /enviar convite/i }).click();

  const row = page.locator("li", { hasText: email });
  await expect(row.getByText("Convite enviado")).toBeVisible();

  await row.getByRole("button", { name: `Reenviar convite para ${email}` }).click();
  await expect(toast(page)).toContainText(`Convite reenviado para ${email}.`);

  await row.getByRole("button", { name: `Cancelar convite de ${email}` }).click();
  await row.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(toast(page)).toContainText("Convite cancelado.");
  await expect(page.locator("li", { hasText: email })).toHaveCount(0);
});
