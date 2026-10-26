import { test, expect } from "@playwright/test";
import { createUser, toast } from "./helpers";

// 1x1 PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test.describe("Profile", () => {
  test("profile icon opens the profile page; name + birth date persist", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email profissional").fill("revenda2@vestiq.dev");
    await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // desktop viewport → open profile from the sidebar account block
    await page
      .getByRole("link", { name: /meu perfil|clara/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/perfil/);
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();

    const newName = `Clara Teste ${Date.now() % 10000}`;
    await page.getByLabel("Nome completo").fill(newName);
    await page.getByLabel("Data de nascimento").fill("1990-03-15");
    await page.setInputFiles("input[name=avatar]", {
      name: "foto.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByRole("status").getByText(/perfil atualizado/i)).toBeVisible();

    // reload → values are still there
    await page.reload();
    await expect(page.getByLabel("Nome completo")).toHaveValue(newName);
    await expect(page.getByLabel("Data de nascimento")).toHaveValue("1990-03-15");
    await expect(page.locator("section img").first()).toHaveAttribute("src", /avatars/);
  });

  test("removes the profile photo", async ({ page }, testInfo) => {
    // A foto é estado compartilhado da conta: rodar nos dois projetos ao mesmo
    // tempo faria um apagar a foto que o outro acabou de salvar.
    test.skip(testInfo.project.name !== "chromium", "estado compartilhado da conta");

    // conta diferente da do teste de gravação, que afirma que a foto existe
    await page.goto("/login");
    await page.getByLabel("Email profissional").fill("fabrica@vestiq.dev");
    await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/perfil");
    const photoCard = page.locator("section").filter({ hasText: "Foto do perfil" });

    // garante que existe uma foto para remover
    await page.setInputFiles("input[name=avatar]", {
      name: "foto.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByRole("status").getByText(/perfil atualizado/i)).toBeVisible();
    await page.reload();
    await expect(photoCard.locator("img")).toHaveCount(1);

    await photoCard.getByRole("button", { name: /remover foto/i }).click();
    await expect(photoCard.locator("img")).toHaveCount(0);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByRole("status").getByText(/perfil atualizado/i)).toBeVisible();

    // reload → a foto não volta
    await page.reload();
    await expect(photoCard.locator("img")).toHaveCount(0);
    await expect(photoCard.getByRole("button", { name: /remover foto/i })).toHaveCount(0);
  });

  test("can sign out from the profile page", async ({ page }) => {
    // different user from the save test — signOut revokes all sessions of a user
    await page.goto("/login");
    await page.getByLabel("Email profissional").fill("fabrica@vestiq.dev");
    await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
    await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/perfil");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // VES-92 — a fresh user, so the shared demo passwords never change.
  test("changes the password from the profile and keeps the session", async ({ page, request }) => {
    const email = await createUser(request, "senha-antiga-1");
    const signIn = async (password: string) => {
      await page.goto("/login");
      await page.getByLabel("Email profissional").fill(email);
      await page.getByLabel("Senha", { exact: true }).fill(password);
      await page.getByRole("button", { name: /entrar na plataforma/i }).click();
    };
    await signIn("senha-antiga-1");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/perfil");
    await page.getByLabel("Senha atual").fill("errada-123");
    await page.getByLabel("Nova senha", { exact: true }).fill("senha-nova-12");
    await page.getByLabel("Confirmar nova senha").fill("senha-nova-12");
    await page.getByRole("button", { name: "Alterar senha" }).click();
    await expect(page.getByText("Senha atual incorreta.")).toBeVisible();

    await page.getByLabel("Senha atual").fill("senha-antiga-1");
    await page.getByLabel("Nova senha", { exact: true }).fill("senha-nova-12");
    await page.getByLabel("Confirmar nova senha").fill("senha-nova-12");
    await page.getByRole("button", { name: "Alterar senha" }).click();
    await expect(toast(page)).toHaveText("Senha alterada.");

    await page.reload();
    await expect(page).toHaveURL(/\/perfil/);
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/\/login/);

    await signIn("senha-antiga-1");
    await expect(page.locator("p[role=alert], [role=alert]").first()).toBeVisible();
    await signIn("senha-nova-12");
    await expect(page).not.toHaveURL(/\/login/);
  });
});
