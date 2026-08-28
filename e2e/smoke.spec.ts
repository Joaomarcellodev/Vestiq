import { test, expect } from "@playwright/test";

const RESELLER = { email: "revenda@vestiq.dev", password: "vestiq123" };

test("authenticated pages render without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/login");
  await page.getByLabel("Email profissional").fill(RESELLER.email);
  await page.getByLabel("Senha", { exact: true }).fill(RESELLER.password);
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  for (const [path, heading] of [
    ["/produtos", /invent[áa]rio/i],
    ["/produtos/novo", /novo produto/i],
    ["/vendas", /vendas/i],
    ["/vendas/nova", /registrar venda/i],
    ["/clientes", /gest[ãa]o de clientes/i],
    ["/clientes/novo", /novo cliente/i],
    ["/rede", /rede de oportunidades/i],
    ["/negociacoes", /painel de negocia/i],
    ["/mais", /mais/i],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }

  expect(errors).toEqual([]);
});
