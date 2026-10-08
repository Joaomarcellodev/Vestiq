import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("archive then unarchive a product", async ({ page }) => {
  await login(page, "revenda@vestiq.dev");

  await page.goto("/produtos");
  await page.getByRole("link", { name: /T-Shirt Gucci/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);

  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}\/arquivar/);
  await page.waitForLoadState("networkidle"); // controlled inputs: fill after hydration
  // Keep the seed stock out of the network: offer nothing, just archive.
  for (const qty of await page.getByLabel("Quantidade").all()) await qty.fill("0");
  await page.getByRole("button", { name: "Arquivar produto" }).click();
  await expect(page).toHaveURL(/\/produtos(\?|$)/);
  await expect(page.getByText("Produto arquivado.")).toBeVisible();

  // now visible under "Arquivados"
  await page.getByRole("link", { name: "Arquivados" }).click();
  await expect(page.getByText(/T-Shirt Gucci/i)).toBeVisible();

  // Other tests leave archived products too: unarchive this one's card.
  await page
    .getByRole("listitem")
    .filter({ hasText: /T-Shirt Gucci/i })
    .getByRole("button", { name: "Desarquivar" })
    .click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "Arquivar" })).toBeVisible();
});

test("archiving publishes the stock as an offer the network sees (VES-69)", async ({
  page,
  browser,
}) => {
  await login(page, "revenda@vestiq.dev");
  const name = `Peça Arquivo ${Date.now() % 100000}`;
  await page.goto("/produtos/novo");
  await page.getByLabel(/nome do produto/i).fill(name);
  await page.getByLabel("Custo (R$)").fill("80");
  await page.getByLabel("Preço de venda (R$)").fill("150");
  await page.getByLabel("Estoque inicial").fill("2");
  await page.getByRole("button", { name: /salvar produto/i }).click();
  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Arquivar" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Quantidade")).toHaveValue("2");
  await expect(page.getByLabel("Preço de repasse (R$)")).toHaveValue("80");
  await page.getByRole("button", { name: "Arquivar e publicar 1 oferta" }).click();
  await expect(page.getByText("Produto arquivado e peças publicadas na rede.")).toBeVisible();

  const peer = await (await browser.newContext()).newPage();
  await login(peer, "revenda2@vestiq.dev");
  await peer.goto(`/rede?q=${encodeURIComponent(name)}`);
  await expect(peer.getByText(name, { exact: true })).toBeVisible();

  // Leave the demo network as it was.
  await page.goto(`/rede?q=${encodeURIComponent(name)}`);
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await expect(page).toHaveURL(/\/rede\/ofertas\//);
  await page.getByRole("button", { name: "Cancelar oferta" }).click();
  await expect(page.getByText("Oferta cancelada.")).toBeVisible();
});
