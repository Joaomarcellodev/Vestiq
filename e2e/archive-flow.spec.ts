import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("archive then unarchive a product", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");

  await page.goto("/produtos");
  await page.getByRole("link", { name: /T-Shirt Gucci/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);

  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page).toHaveURL(/\/produtos(\?|$)/);
  await expect(page.getByText("Produto arquivado.")).toBeVisible();

  // now visible under "Arquivados"
  await page.getByRole("link", { name: "Arquivados" }).click();
  await expect(page.getByText(/T-Shirt Gucci/i)).toBeVisible();

  await page.getByRole("button", { name: "Desarquivar" }).first().click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Arquivar" })).toBeVisible();
});
