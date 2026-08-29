import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("create a product with a photo — thumbnail on the list, gallery on the detail", async ({
  page,
}) => {
  await login(page, "revenda@vestiq.dev");
  await page.goto("/produtos/novo");
  const name = `Peça Foto ${Date.now() % 100000}`;
  await page.getByLabel(/nome do produto/i).fill(name);
  await page.getByLabel("Preço de venda (R$)").fill("120");
  await page.locator("input[type=file]").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByRole("button", { name: /salvar produto/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);
  await expect(page.locator("main img").first()).toBeVisible();

  await page.goto("/produtos");
  await expect(page.locator("ul li a[href^='/produtos/'] img").first()).toBeVisible();
});
