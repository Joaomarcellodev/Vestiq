import { expect, type Page } from "@playwright/test";

/** The flash/toast region (excludes the Spinner, which also has role=status). */
export function toast(page: Page) {
  return page.locator('[aria-live="polite"] [role="status"]');
}

/** The form-level error banner (excludes Next's route announcer). */
export function formAlert(page: Page) {
  return page.locator('p[role="alert"]');
}

export async function login(page: Page, email: string, password = "vestiq123") {
  await page.goto("/login");
  await page.getByLabel("Email profissional").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: /entrar na plataforma/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

const MAILPIT = "http://127.0.0.1:54424";
const SUPABASE_URL = "http://127.0.0.1:54421";
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

/** Create a confirmed auth user via the admin API — for tests that must not
 *  disturb the shared demo accounts. */
export async function createUser(
  request: import("@playwright/test").APIRequestContext,
  password = "vestiq123",
): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@vestiq.test`;
  const res = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    data: { email, password, email_confirm: true },
  });
  if (!res.ok()) throw new Error(`createUser failed: ${res.status()} ${await res.text()}`);
  return email;
}

/** Latest email HTML sent to `to`, from the local Mailpit inbox. */
export async function latestEmailBody(
  request: import("@playwright/test").APIRequestContext,
  to: string,
): Promise<string> {
  const list = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
  );
  const { messages } = (await list.json()) as { messages: { ID: string }[] };
  if (!messages?.length) return "";
  const msg = await request.get(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
  const body = (await msg.json()) as { Text?: string; HTML?: string };
  return body.HTML ?? body.Text ?? "";
}

/** VES-93 — click a guarded button, then confirm in its dialog. */
export async function confirmAction(page: Page, button: string, confirm = button) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
  await expect(dialog).toBeHidden();
}
