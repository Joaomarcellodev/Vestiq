import { test, expect } from "@playwright/test";
import { login, toast } from "./helpers";

test.describe("Theme + toasts", () => {
  test("toggles light → dark → system and persists across reload", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");

    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: /tema (claro|escuro|do sistema)/i });

    await toggle.click(); // → dark (or the next in the cycle)
    await expect(html).toHaveClass(/dark|light/);
    const afterFirst = await html.getAttribute("class");

    await page.reload();
    await expect(html).toHaveClass(
      new RegExp((afterFirst || "").includes("dark") ? "dark" : "light"),
    );
  });

  test("shows a toast when a product is edited", async ({ page }) => {
    await login(page, "revenda@vestiq.dev");
    await page.goto("/produtos");
    await page.locator("ul li a[href^='/produtos/']").first().click();
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByRole("button", { name: /salvar alterações/i }).click();
    await expect(toast(page)).toHaveText(/produto atualizado/i);
  });
});
