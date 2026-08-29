import { test, expect } from "@playwright/test";
import { login, latestEmailBody, createUser } from "./helpers";

test.describe("Auth", () => {
  test("logs in and out", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("guards a private route and preserves the target", async ({ page }) => {
    await page.goto("/vendas");
    await expect(page).toHaveURL(/\/login\?next=%2Fvendas/);
  });

  test("ignores a protocol-relative open redirect", async ({ page }) => {
    await page.goto("/login?next=//evil.example");
    await page.getByLabel("Email profissional").fill("revenda@vestiq.dev");
    await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("no Apple sign-in, only Google", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /continuar com google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /apple/i })).toHaveCount(0);
  });

  test("forgot-password: request → email link → set a new password → logged in", async ({
    page,
    request,
  }) => {
    const email = await createUser(request, "old-password-1");

    await page.goto("/recuperar-senha");
    await page.getByLabel("Email profissional").fill(email);
    await page.getByRole("button", { name: /enviar link/i }).click();
    await expect(page.getByText(/se existe uma conta com esse email/i)).toBeVisible();

    // pull the reset link out of the local inbox
    let html = "";
    await expect(async () => {
      html = await latestEmailBody(request, email);
      expect(html).toMatch(/href="([^"]*(auth\/v1\/verify|\/auth\/callback)[^"]*)"/);
    }).toPass({ timeout: 10_000 });

    const link = html
      .match(/href="([^"]*(?:auth\/v1\/verify|\/auth\/callback)[^"]*)"/)![1]!
      .replace(/&amp;/g, "&");
    await page.goto(link);
    await expect(page).toHaveURL(/\/redefinir-senha/);

    await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-123");
    await page.getByLabel("Confirmar nova senha").fill("nova-senha-123");
    await page.getByRole("button", { name: /redefinir senha/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|aguardando-convite)/);
  });

  test("invalid reset link shows a message", async ({ page }) => {
    await page.goto("/redefinir-senha");
    await expect(page.getByText(/link de redefinição é inválido ou expirou/i)).toBeVisible();
  });
});
