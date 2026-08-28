import { test, expect } from "@playwright/test";

// 1x1 PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAChwGA60e6kgAAAABJRU5ErkJggg==",
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

    await expect(page.getByText(/perfil atualizado/i)).toBeVisible();

    // reload → values are still there
    await page.reload();
    await expect(page.getByLabel("Nome completo")).toHaveValue(newName);
    await expect(page.getByLabel("Data de nascimento")).toHaveValue("1990-03-15");
    await expect(page.locator("section img").first()).toHaveAttribute("src", /avatars/);
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
});
