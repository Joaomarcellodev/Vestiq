/**
 * VES-94 — removes what the automated tests leave in the LOCAL database, so the
 * demo data from `scripts/seed.mjs` stays clean for manual testing:
 *
 * - users with a `@vestiq.test` email (vitest's `makeUser`, Playwright's
 *   `createUser`, invite specs) and the organizations only they belong to —
 *   deleting an organization cascades its catalog, stock, sales, offers,
 *   networks and negotiations;
 * - what the E2E specs create inside the demo organizations, recognised by the
 *   names they use ("Peça Foto 12345", "Cliente E2E 12345", …).
 *
 * Runs after `npx playwright test` (globalTeardown) and the vitest run
 * (globalSetup teardown); by hand: `node scripts/clean-test-data.mjs`.
 * It refuses any database that isn't on this machine — never the hosted one.
 */
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

/** Names the E2E specs give to what they create in the demo organizations. */
export const E2E_PRODUCT = /^Peça (Foto|Ofertada|Arquivo|Histórico|Fábrica|Aviso) \d+$/;
export const E2E_CUSTOMER = /^Cliente E2E \d+( \(editado\))?$/;
export const E2E_OFFER_NOTE = /^Foto e2e \d+$/;
export const E2E_ORDER_NOTE = /^E2E \d+$/;
export const TEST_EMAIL = /@vestiq\.test$/i;

export function isLocalUrl(url) {
  try {
    return ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const chunks = (list, size = 100) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, i * size + size),
  );

async function all(query) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query().range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

/**
 * @param {{ url?: string, secretKey?: string, log?: (msg: string) => void }} [opts]
 * @returns {Promise<null | Record<string, number>>} what was removed, or null when skipped
 */
export async function cleanTestData({
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secretKey = process.env.SUPABASE_SECRET_KEY,
  log = console.log,
} = {}) {
  if (!url || !secretKey || !isLocalUrl(url)) {
    log(`[clean-test-data] pulado: só limpa o Supabase local (url: ${url ?? "—"}).`);
    return null;
  }
  const db = createClient(url, secretKey, { auth: { persistSession: false } });
  const removed = { users: 0, organizations: 0, products: 0, customers: 0, offers: 0, orders: 0 };

  // 1. Test users and the organizations that have no one else.
  const testUsers = new Set();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && TEST_EMAIL.test(u.email)) testUsers.add(u.id);
    if (data.users.length < 1000) break;
  }
  const members = await all(() =>
    db.from("organization_members").select("organization_id, user_id").order("organization_id"),
  );
  const byOrg = new Map();
  for (const m of members) {
    byOrg.set(m.organization_id, [...(byOrg.get(m.organization_id) ?? []), m.user_id]);
  }
  const testOrgs = [...byOrg]
    .filter(([, users]) => users.every((id) => testUsers.has(id)))
    .map(([org]) => org);
  for (const ids of chunks(testOrgs)) {
    const { error, count } = await db
      .from("organizations")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) log(`[clean-test-data] organizações: ${error.message}`);
    else removed.organizations += count ?? 0;
  }
  for (const id of testUsers) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (!error) removed.users += 1;
  }

  // 2. What the E2E specs create inside the demo organizations.
  const products = (await all(() => db.from("products").select("id, name").order("id"))).filter(
    (p) => E2E_PRODUCT.test(p.name),
  );
  for (const p of products) {
    const { error } = await db.from("products").delete().eq("id", p.id);
    if (!error) removed.products += 1;
    // Sold items keep the product (sale history) — archive it instead.
    else await db.from("products").update({ archived_at: new Date().toISOString() }).eq("id", p.id);
  }

  const customers = (await all(() => db.from("customers").select("id, name").order("id"))).filter(
    (c) => E2E_CUSTOMER.test(c.name),
  );
  for (const ids of chunks(customers.map((c) => c.id))) {
    const { error, count } = await db.from("customers").delete({ count: "exact" }).in("id", ids);
    if (!error) removed.customers += count ?? 0;
  }

  const offers = (await all(() => db.from("offers").select("id, note").order("id"))).filter(
    (o) => o.note && E2E_OFFER_NOTE.test(o.note),
  );
  for (const ids of chunks(offers.map((o) => o.id))) {
    const { error, count } = await db.from("offers").delete({ count: "exact" }).in("id", ids);
    if (!error) removed.offers += count ?? 0;
  }

  const orders = (
    await all(() =>
      db
        .from("supply_orders")
        .select("id, note, reseller_id, created_at, delivered_at, supply_order_items(product_name)")
        .order("id"),
    )
  ).filter((o) => o.note && E2E_ORDER_NOTE.test(o.note));
  // Receiving an order adds its products to the reseller's catalog: drop the ones
  // that receipt created (same names, created between the order and its delivery).
  for (const o of orders.filter((o) => o.delivered_at)) {
    const names = [...new Set(o.supply_order_items.map((i) => i.product_name))];
    const { data: received } = await db
      .from("products")
      .select("id")
      .eq("organization_id", o.reseller_id)
      .in("name", names)
      .gte("created_at", o.created_at)
      .lte("created_at", o.delivered_at);
    for (const p of received ?? []) {
      const { error } = await db.from("products").delete().eq("id", p.id);
      if (!error) removed.products += 1;
    }
  }
  for (const ids of chunks(orders.map((o) => o.id))) {
    const { error, count } = await db
      .from("supply_orders")
      .delete({ count: "exact" })
      .in("id", ids);
    if (!error) removed.orders += count ?? 0;
  }

  log(
    `[clean-test-data] removidos: ${removed.users} usuários de teste, ${removed.organizations} organizações, ` +
      `${removed.products} produtos, ${removed.customers} clientes, ${removed.offers} ofertas, ${removed.orders} pedidos.`,
  );
  return removed;
}

// CLI: node scripts/clean-test-data.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { loadEnvLocal } = await import("./load-env.mjs");
  loadEnvLocal();
  await cleanTestData();
}
