/**
 * VES-71 — prepares the load test (docs/LOAD_TEST.md): a factory network with
 * N reseller accounts of their own (`carga-N@vestiq.test`, so the demo data is
 * untouched and `node scripts/clean-test-data.mjs` removes them), each with a
 * product, plenty of stock, a published offer and some movements; then signs
 * each one in and writes its session cookies for k6.
 *
 *   node scripts/load/setup.mjs [resellers=20]
 *
 * Local database only — it refuses any other Supabase URL.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { loadEnvLocal } from "../load-env.mjs";
import { isLocalUrl } from "../clean-test-data.mjs";

loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54421";
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const RESELLERS = Number(process.argv[2] ?? 20);
const PASSWORD = "carga-vestiq-123";
const OUT = new globalThis.URL("./.sessions.json", import.meta.url);

if (!isLocalUrl(URL)) {
  console.error(
    `Recusado: ${URL} não é o Supabase local. O teste de carga nunca roda contra a produção.`,
  );
  process.exit(1);
}
if (!SECRET || !PUBLISHABLE) {
  console.error("Chaves do Supabase ausentes em .env.local (rode `npx supabase start`).");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const run = Date.now();

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Signs in like the browser does and returns the cookies the app reads. */
async function sessionCookies(email) {
  const jar = new Map();
  const ssr = createServerClient(URL, PUBLISHABLE, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await ssr.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return {
    cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    accessToken: data.session.access_token,
  };
}

async function makeUser(email, name) {
  const data = await must(
    admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    }),
    `createUser ${email}`,
  );
  return data.user.id;
}

async function makeOrg(userId, name, type, role) {
  const org = await must(
    admin.from("organizations").insert({ name, type }).select().single(),
    `org ${name}`,
  );
  await must(
    admin
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: userId, role, status: "ACTIVE" }),
    `member ${name}`,
  );
  return org;
}

const factoryUser = await makeUser(`carga-fabrica-${run}@vestiq.test`, "Fábrica Carga");
const factory = await makeOrg(factoryUser, `Fábrica Carga ${run}`, "FACTORY", "FACTORY_ADMIN");
const network = await must(
  admin
    .from("factory_networks")
    .insert({ factory_id: factory.id, name: `Rede Carga ${run}` })
    .select()
    .single(),
  "network",
);

const sessions = [];
for (let i = 1; i <= RESELLERS; i += 1) {
  const email = `carga-${i}-${run}@vestiq.test`;
  const userId = await makeUser(email, `Revendedora Carga ${i}`);
  const org = await makeOrg(userId, `Loja Carga ${i} ${run}`, "RESELLER", "RESELLER");
  await must(
    admin.from("network_members").insert({
      network_id: network.id,
      reseller_id: org.id,
      invited_email: email,
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
    }),
    "network member",
  );

  const { cookie, accessToken } = await sessionCookies(email);
  const asReseller = createClient(URL, PUBLISHABLE, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const product = await must(
    admin
      .from("products")
      .insert({ organization_id: org.id, name: `Vestido Carga ${i}`, brand: "Vestiq" })
      .select()
      .single(),
    "product",
  );
  const variant = await must(
    admin
      .from("product_variants")
      .insert({
        product_id: product.id,
        organization_id: org.id,
        size: "M",
        color: "Preto",
        retail_price: 199.9,
        cost_price: 80,
      })
      .select()
      .single(),
    "variant",
  );
  // Enough stock for every sale of the run, plus a short movement history.
  await must(
    asReseller.rpc("record_inventory_entry", { p_variant_id: variant.id, p_quantity: 100000 }),
    "stock",
  );
  await must(
    asReseller.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: network.id,
      p_quantity: 5,
      p_transfer_price: 120,
    }),
    "offer",
  );
  for (let s = 0; s < 3; s += 1) {
    await must(
      asReseller.rpc("confirm_sale", {
        p_payment_method: "PIX",
        p_items: [{ variant_id: variant.id, quantity: 1 }],
      }),
      "sale",
    );
  }

  sessions.push({ cookie, accessToken, productId: product.id, variantId: variant.id });
  process.stdout.write(`\r${i}/${RESELLERS} revendedoras prontas`);
}

mkdirSync(new globalThis.URL("./results/", import.meta.url), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ supabaseUrl: URL, publishableKey: PUBLISHABLE, sessions }, null, 2),
);
console.log(`\nSessões em scripts/load/.sessions.json (válidas por ~1 h).`);
