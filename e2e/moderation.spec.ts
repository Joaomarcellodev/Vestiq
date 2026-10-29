import { test, expect } from "@playwright/test";
import { login, toast } from "./helpers";

// VES-43 + VES-44 — a reseller reports an offer; the platform admin archives the report.
// Archiving keeps the demo data as it was (the offer stays) and frees a new open report.
test.describe.configure({ mode: "serial" });

test("a report goes from the offer to the moderation queue and gets archived", async ({
  browser,
}, testInfo) => {
  // one open report per reseller and offer: the two projects would collide
  test.skip(testInfo.project.name !== "chromium", "estado compartilhado da conta");
  const reseller = await browser.newPage();
  await login(reseller, "revenda2@vestiq.dev");
  await reseller.goto("/rede");
  await reseller
    .locator("li", { has: reseller.getByText("Atelier Sarah") })
    .filter({ hasNot: reseller.getByText("Sua oferta") })
    .getByRole("link", { name: /ver detalhes/i })
    .first()
    .click();
  await expect(reseller).toHaveURL(/\/rede\/ofertas\/[0-9a-f-]{36}$/);
  const offerUrl = reseller.url();

  await reseller.getByRole("link", { name: "Denunciar oferta" }).click();
  await expect(reseller.getByRole("heading", { name: "Denunciar" })).toBeVisible();
  await reseller.getByLabel("Spam ou anúncio repetido").check();
  const note = `E2E ${Date.now()}`;
  await reseller.getByLabel("O que aconteceu? (opcional)").fill(note);
  await reseller.getByRole("button", { name: "Enviar denúncia" }).click();
  await expect(reseller).toHaveURL(offerUrl);
  await expect(toast(reseller)).toContainText("Denúncia enviada");
  await reseller.close();

  const moderator = await browser.newPage();
  await moderator.goto("/login");
  await moderator.getByLabel("Email profissional").fill("admin@vestiq.dev");
  await moderator.getByLabel("Senha", { exact: true }).fill("vestiq123");
  await moderator.getByRole("button", { name: /entrar na plataforma/i }).click();
  // the platform's home is the moderation queue
  await expect(moderator).toHaveURL(/\/moderacao$/);
  await moderator
    .getByRole("link", { name: /Spam ou anúncio repetido.*Clara Boutique/s })
    .first()
    .click();
  await expect(moderator).toHaveURL(/\/moderacao\/denuncias\/[0-9a-f-]{36}$/);
  await expect(moderator.getByText(note)).toBeVisible();
  await expect(moderator.getByRole("button", { name: "Remover oferta" })).toBeVisible();

  await moderator.getByLabel("Motivo da decisão").fill("Teste automatizado");
  await moderator.getByRole("button", { name: "Arquivar denúncia" }).click();
  await expect(toast(moderator)).toContainText("Denúncia arquivada");
  await expect(moderator.getByText("Teste automatizado")).toBeVisible();
  await moderator.close();
});

test("the moderation panel is a 404 for a reseller", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");
  await page.goto("/moderacao");
  await expect(page.getByText("Não encontramos o que você procura")).toBeVisible();
});
