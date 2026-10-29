import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./helpers";

// VES-103 — automatic WCAG 2 A/AA check (axe) on the main screens. Any violation
// fails the test, listed as "<page> [impact] <rule>: <element>".

async function violations(page: Page, where: string) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations.flatMap((v) =>
    v.nodes.map((n) => `${where} [${v.impact}] ${v.id}: ${n.target.join(" ")}`),
  );
}

async function scan(page: Page, paths: string[]) {
  const found: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    found.push(...(await violations(page, path)));
  }
  return found;
}

test("the login screen is accessible", async ({ page }) => {
  await page.goto("/login");
  expect(await violations(page, "/login")).toEqual([]);
});

test("the reseller's main screens are accessible", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "revenda@vestiq.dev");
  const found = await scan(page, [
    "/dashboard",
    "/produtos",
    "/produtos/novo",
    "/vendas",
    "/vendas/nova",
    "/clientes",
    "/clientes/novo",
    "/rede",
    "/negociacoes",
    "/pedidos",
    "/fornecedores",
    "/perfil",
    "/mais",
  ]);

  // Screens that only show their fields after a step: a sale with an item
  // (discount, quantity), and the detail pages.
  await page.goto("/vendas/nova");
  await page.getByPlaceholder("Buscar produto no estoque...").fill("Chanel");
  await page
    .getByRole("button", { name: /Bolsa Chanel/i })
    .first()
    .click();
  found.push(...(await violations(page, "/vendas/nova (com item)")));

  await page.goto("/vendas");
  await page.locator("a[href^='/vendas/']").filter({ hasNotText: /nova/i }).first().click();
  found.push(...(await violations(page, "/vendas/[id]")));

  await page.goto("/clientes");
  await page.getByRole("link", { name: /Maria Rodrigues/ }).click();
  found.push(...(await violations(page, "/clientes/[id]")));

  await page.goto("/produtos");
  await page.locator("ul li a[href^='/produtos/']").first().click();
  found.push(...(await violations(page, "/produtos/[id]")));
  await page.getByRole("link", { name: "Editar" }).click();
  found.push(...(await violations(page, "/produtos/[id]/editar")));

  expect(found).toEqual([]);
});

test("the factory's main screens are accessible", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, "fabrica@vestiq.dev");
  const found = await scan(page, [
    "/dashboard",
    "/produtos",
    "/produtos/novo",
    "/rede",
    "/pedidos",
  ]);
  expect(found).toEqual([]);
});
