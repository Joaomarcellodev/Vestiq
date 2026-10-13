import { test, expect } from "@playwright/test";
import { createUser, login, toast } from "./helpers";

// VES-95 — a new reseller joins the network from the invite link alone.

/** Invites `email` as the demo factory and returns the copied invite link. */
async function inviteAndCopyLink(browser: import("@playwright/test").Browser, email: string) {
  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const factory = await ctx.newPage();
  await login(factory, "fabrica@vestiq.dev");
  await factory.goto("/rede-fabrica");
  await factory.getByLabel("Email da revendedora").fill(email);
  await factory.getByRole("button", { name: /enviar convite/i }).click();

  const row = factory.locator("li", { hasText: email });
  await row.getByRole("button", { name: /copiar link/i }).click();
  // "Convite enviado." may still be on screen: pick the copy toast by its text.
  await expect(toast(factory).filter({ hasText: "Link do convite copiado." })).toBeVisible();
  const link = await factory.evaluate(() => navigator.clipboard.readText());
  await ctx.close();
  expect(link).toMatch(/\/convite\/[0-9a-f-]{36}$/);
  return link;
}

test("invite → signup → the new reseller's dashboard", async ({ browser }) => {
  const email = `e2e-convite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@vestiq.test`;
  const link = await inviteAndCopyLink(browser, email);

  // The invitee opens the link with no session at all.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(link);
  const emailField = page.getByLabel("Email", { exact: true });
  await expect(emailField).toHaveValue(email);
  await expect(emailField).toBeDisabled();

  await page.getByLabel("Nome da sua loja").fill("Loja Convidada E2E");
  await page.getByLabel("Crie sua senha", { exact: true }).fill("senha-forte-1");
  await page.getByLabel("Confirme a senha", { exact: true }).fill("senha-forte-1");
  await page.getByRole("button", { name: /criar conta e entrar na rede/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(toast(page)).toContainText("Bem-vindo à rede!");

  // The link is spent now.
  await ctx.clearCookies();
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Convite já utilizado" })).toBeVisible();
  await ctx.close();
});

test("an existing account signs in from the link and accepts", async ({ browser, request }) => {
  const email = await createUser(request);
  const link = await inviteAndCopyLink(browser, email);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(link);
  await expect(page.getByLabel("Nome da sua loja")).toHaveCount(0);
  await page.getByLabel("Email profissional").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();

  await expect(page).toHaveURL(new URL(link).pathname);
  await page.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await ctx.close();
});

test("an unknown invite link says so", async ({ page }) => {
  await page.goto("/convite/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: "Convite inválido" })).toBeVisible();
  await page.goto("/convite/nao-e-um-token");
  await expect(page.getByRole("heading", { name: "Convite inválido" })).toBeVisible();
});
