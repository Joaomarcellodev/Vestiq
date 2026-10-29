import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// VES-65 — a peer's name opens her public profile: identity, counters and showcase.
test("a reseller opens a network peer's public profile from an offer", async ({ page }) => {
  await login(page, "revenda2@vestiq.dev");

  await page.goto("/rede");
  await page.getByRole("link", { name: "Atelier Sarah", exact: true }).first().click();
  await expect(page).toHaveURL(/\/rede\/revendedoras\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Atelier Sarah");
  await expect(page.getByText("Ofertas ativas")).toBeVisible();
  await expect(page.getByText("Negócios concluídos")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vitrine" })).toBeVisible();
  // Every card of the showcase is hers, and none links back to the profile.
  await expect(page.getByRole("link", { name: /ver detalhes/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Atelier Sarah", exact: true })).toHaveCount(0);

  // An id that isn't a profile she can see is a plain 404.
  await page.goto("/rede/revendedoras/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("Não encontramos o que você procura")).toBeVisible();
});
