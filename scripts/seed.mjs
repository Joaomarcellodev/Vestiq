/**
 * Development seed — creates demo users, organizations, a factory network,
 * catalog, stock, a customer and an offer. Idempotent-ish: safe to re-run after
 * `npm run db:reset`.
 *
 *   node scripts/seed.mjs
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54421";
const SECRET =
  process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

const db = createClient(URL, SECRET, { auth: { persistSession: false } });

async function ensureUser(email, password, fullName) {
  const { data: list } = await db.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

async function insert(table, row, conflictSelect) {
  if (conflictSelect) {
    const { data: found } = await db.from(table).select("*").match(conflictSelect).maybeSingle();
    if (found) return found;
  }
  const { data, error } = await db.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function main() {
  // --- users ---------------------------------------------------------------
  const factoryAdmin = await ensureUser("fabrica@vestiq.dev", "vestiq123", "Ana (Fábrica)");
  const resellerA = await ensureUser("revenda@vestiq.dev", "vestiq123", "Sarah Mendes");
  const resellerB = await ensureUser("revenda2@vestiq.dev", "vestiq123", "Clara Boutique");

  // --- organizations -----------------------------------------------------
  const factory = await insert(
    "organizations",
    { name: "Fábrica Modah", type: "FACTORY" },
    { name: "Fábrica Modah" },
  );
  const orgA = await insert(
    "organizations",
    { name: "Atelier Sarah", type: "RESELLER" },
    { name: "Atelier Sarah" },
  );
  const orgB = await insert(
    "organizations",
    { name: "Clara Boutique", type: "RESELLER" },
    { name: "Clara Boutique" },
  );

  const members = [
    { organization_id: factory.id, user_id: factoryAdmin, role: "FACTORY_ADMIN", status: "ACTIVE" },
    { organization_id: orgA.id, user_id: resellerA, role: "RESELLER", status: "ACTIVE" },
    { organization_id: orgB.id, user_id: resellerB, role: "RESELLER", status: "ACTIVE" },
  ];
  for (const m of members) {
    await insert("organization_members", m, {
      organization_id: m.organization_id,
      user_id: m.user_id,
    });
  }

  // --- network ---------------------------------------------------------
  const network = await insert(
    "factory_networks",
    { factory_id: factory.id, name: "Rede Modah" },
    { factory_id: factory.id, name: "Rede Modah" },
  );
  for (const [org, email] of [
    [orgA, "revenda@vestiq.dev"],
    [orgB, "revenda2@vestiq.dev"],
  ]) {
    await insert(
      "network_members",
      {
        network_id: network.id,
        reseller_id: org.id,
        invited_email: email,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
      },
      { network_id: network.id, reseller_id: org.id },
    );
  }

  // --- catalog + stock for org A -------------------------------------
  const category = await insert(
    "categories",
    { organization_id: orgA.id, name: "Bolsas" },
    { organization_id: orgA.id, name: "Bolsas" },
  );
  const product = await insert(
    "products",
    {
      organization_id: orgA.id,
      category_id: category.id,
      name: "Bolsa Chanel Classic Flap",
      brand: "Chanel",
      description: "Couro caviar preto, ferragens douradas.",
    },
    { organization_id: orgA.id, name: "Bolsa Chanel Classic Flap" },
  );
  const variant = await insert(
    "product_variants",
    {
      organization_id: orgA.id,
      product_id: product.id,
      size: "Único",
      color: "Preto",
      sku: "CHANEL-CF-BLK",
      cost_price: 22000,
      retail_price: 35000,
    },
    { organization_id: orgA.id, sku: "CHANEL-CF-BLK" },
  );

  // give it stock via the RPC as the reseller
  const asA = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH", {
    auth: { persistSession: false },
  });
  await asA.auth.signInWithPassword({ email: "revenda@vestiq.dev", password: "vestiq123" });
  const { data: v } = await db
    .from("product_variants")
    .select("stock_on_hand")
    .eq("id", variant.id)
    .single();
  if ((v?.stock_on_hand ?? 0) === 0) {
    const { error } = await asA.rpc("record_inventory_entry", {
      p_variant_id: variant.id,
      p_quantity: 6,
      p_note: "estoque inicial (seed)",
    });
    if (error) console.warn("entry:", error.message);
  }

  // extra catalog so the dashboard has data
  async function ensureVariant(prodName, brand, cat, sku, cost, price, stock) {
    const prod = await insert(
      "products",
      { organization_id: orgA.id, category_id: cat, name: prodName, brand },
      { organization_id: orgA.id, name: prodName },
    );
    const vr = await insert(
      "product_variants",
      { organization_id: orgA.id, product_id: prod.id, size: "Único", sku, cost_price: cost, retail_price: price },
      { organization_id: orgA.id, sku },
    );
    const { data: cur } = await db.from("product_variants").select("stock_on_hand").eq("id", vr.id).single();
    if ((cur?.stock_on_hand ?? 0) === 0) {
      await asA.rpc("record_inventory_entry", { p_variant_id: vr.id, p_quantity: stock, p_note: "estoque inicial (seed)" });
    }
    return vr;
  }
  const tshirt = await ensureVariant("T-Shirt Gucci Logo", "Gucci", category.id, "GUCCI-TEE-01", 800, 1200, 20);
  const sneaker = await ensureVariant("Balenciaga Triple S", "Balenciaga", category.id, "BAL-TS-01", 3200, 5400, 8);

  const clientes = [
    { name: "Maria Rodrigues", email: "maria@exemplo.com" },
    { name: "João Silva", email: "joao@exemplo.com" },
    { name: "Ana Costa", email: "ana@exemplo.com" },
  ];
  const customerIds = [];
  for (const c of clientes) {
    const row = await insert(
      "customers",
      { organization_id: orgA.id, ...c },
      { organization_id: orgA.id, name: c.name },
    );
    customerIds.push(row.id);
  }

  // --- a few sales spread over the last 12 days -----------------------
  const { count: saleCount } = await db
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgA.id);
  if ((saleCount ?? 0) === 0) {
    const plan = [
      { daysAgo: 11, items: [{ variant_id: tshirt.id, quantity: 2 }], customer: customerIds[0] },
      { daysAgo: 9, items: [{ variant_id: sneaker.id, quantity: 1 }], customer: customerIds[1] },
      { daysAgo: 6, items: [{ variant_id: tshirt.id, quantity: 3 }, { variant_id: sneaker.id, quantity: 1 }], customer: customerIds[0] },
      { daysAgo: 3, items: [{ variant_id: tshirt.id, quantity: 1 }], customer: null },
      { daysAgo: 1, items: [{ variant_id: sneaker.id, quantity: 2 }], customer: customerIds[2] },
    ];
    for (const s of plan) {
      const { data: sale, error } = await asA.rpc("confirm_sale", {
        p_payment_method: "PIX",
        p_items: s.items,
        p_discount: 0,
        p_customer_id: s.customer,
      });
      if (error) {
        console.warn("sale:", error.message);
        continue;
      }
      const at = new Date();
      at.setDate(at.getDate() - s.daysAgo);
      await db.from("sales").update({ created_at: at.toISOString() }).eq("id", sale.id);
    }
  }

  // --- an offer on the network from org A ------------------------------
  const { data: existingOffer } = await db
    .from("offers")
    .select("id")
    .eq("product_variant_id", variant.id)
    .maybeSingle();
  if (!existingOffer) {
    const { error } = await asA.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: network.id,
      p_quantity: 3,
      p_transfer_price: 28500,
      p_note: "Nunca usada, plásticos de proteção nas ferragens.",
    });
    if (error) console.warn("offer:", error.message);
  }

  console.log("\n✅ Seed concluído.\n");
  console.log("Usuários (senha: vestiq123):");
  console.log("  • revenda@vestiq.dev   — revendedora (Atelier Sarah) — use este para entrar");
  console.log("  • revenda2@vestiq.dev  — revendedora (Clara Boutique)");
  console.log("  • fabrica@vestiq.dev   — admin de fábrica (Fábrica Modah)\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
