import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// VES-106 TC-OFFER-13/14 — shares the demo accounts with network.spec.ts.
test.describe.configure({ mode: "serial" });

test("an offer published with a photo shows it to the network, and the owner edits it", async ({
  page,
  browser,
}) => {
  const note = `Foto e2e ${Date.now() % 100000}`;
  await login(page, "revenda@vestiq.dev");
  await page.goto("/rede/publicar");
  await page.waitForLoadState("networkidle");
  await page.locator("select[name=variantId]").selectOption({ index: 0 });
  await page.getByLabel(/quantidade ofertada/i).fill("1");
  await page.getByLabel(/preço de transferência/i).fill("99");
  await page.getByLabel("Observação").fill(note);
  await page.locator("input[type=file]").setInputFiles({
    name: "peca.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByText("Capa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /publicar na rede/i }).click();
  await expect(page).toHaveURL(/\/rede(\?|$)/);

  // The feed is newest first: open our offer and keep its address.
  await page.getByRole("button", { name: "Ver detalhes" }).first().click();
  await expect(page).toHaveURL(/\/rede\/ofertas\/[0-9a-f-]{36}/);
  await expect(page.getByText(note)).toBeVisible();
  const offerPath = new URL(page.url()).pathname;

  // The peer sees the offer's own photo (stored under /offers/) in the feed.
  const peer = await (await browser.newContext()).newPage();
  await login(peer, "revenda2@vestiq.dev");
  await peer.goto("/rede");
  const card = peer.getByRole("listitem").filter({ has: peer.locator(`a[href="${offerPath}"]`) });
  await expect(card.locator("img")).toHaveAttribute("src", /offers/);

  // The owner removes it: the offer falls back to the product's photos.
  await expect(page.getByRole("heading", { name: "Fotos da oferta" })).toBeVisible();
  await page.getByRole("button", { name: "Remover imagem" }).click();
  await page.getByRole("button", { name: "Salvar fotos" }).click();
  await expect(page.getByText("Fotos da oferta atualizadas.")).toBeVisible();
  await expect(page.getByText(/mostra as fotos do produto/)).toBeVisible();

  // Leave the demo network as it was.
  await page.getByRole("button", { name: "Cancelar oferta" }).click();
  await expect(page.getByText("Oferta cancelada.")).toBeVisible();
});
