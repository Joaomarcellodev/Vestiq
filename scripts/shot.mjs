import { chromium } from "@playwright/test";

const pages = process.argv.slice(2);
const browser = await chromium.launch();

async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email profissional").fill("revenda@vestiq.dev");
  await page.getByLabel("Senha", { exact: true }).fill("vestiq123");
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();
  await page.waitForURL(/dashboard/);
  await page.close();
}

for (const [i, spec] of pages.entries()) {
  const [path, width = "390"] = spec.split("@");
  const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 } });
  if (path !== "/login") await login(ctx);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const dir = process.env.SHOT_DIR ?? "/tmp";
  const name = `${dir}/shot-${i}-${path.replace(/\W+/g, "_")}-${width}.png`;
  await page.screenshot({ path: name, fullPage: true });
  console.log(name);
  await ctx.close();
}

await browser.close();
