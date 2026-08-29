import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeUser, supabaseUp } from "@/test/supabase";
import {
  clearTestClient,
  expectRedirect,
  formData,
  makeCustomer,
  useTestClient,
} from "@/test/actions";
import { isValidCPF } from "@/lib/utils/cpf";
import { archiveCustomer, createCustomer, unarchiveCustomer, updateCustomer } from "./actions";
import { getCustomerWithHistory, listCustomers } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

// A syntactically valid CPF for the happy path.
const CPF = "52998224725";

d("customers actions + queries (SPEC-006)", () => {
  let orgId: string;

  beforeEach(async () => {
    const u = await makeUser();
    orgId = (await makeOrg(u.userId, "RESELLER")).id;
    useTestClient(u.client);
  });
  afterEach(() => clearTestClient());

  const cForm = (over: Record<string, unknown>) =>
    formData({ email: "", phone: "", document: "", notes: "", ...over });

  it("sanity: the sample CPF is valid", () => {
    expect(isValidCPF(CPF)).toBe(true);
  });

  it("createCustomer: creates and redirects", async () => {
    await expectRedirect(
      () => createCustomer({}, cForm({ name: "Ana Silva", email: "ana@x.com", document: CPF })),
      /^\/clientes\?toast=customer-created$/,
    );
    const { data } = await admin()
      .from("customers")
      .select("name, email, document")
      .eq("organization_id", orgId);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.name).toBe("Ana Silva");
  });

  it("createCustomer: rejects an invalid CPF (zod)", async () => {
    const state = await createCustomer({}, cForm({ name: "X", document: "123" }));
    expect(state.error).toMatch(/CPF inválido/i);
  });

  it("createCustomer: rejects an invalid email (zod)", async () => {
    const state = await createCustomer({}, cForm({ name: "X", email: "not-an-email" }));
    expect(state.error).toMatch(/email/i);
  });

  it("createCustomer: surfaces a duplicate CPF", async () => {
    await makeCustomer(orgId, { document: CPF });
    const state = await createCustomer({}, cForm({ name: "Outro", document: CPF }));
    expect(state.error).toMatch(/CPF já existe/i);
  });

  it("updateCustomer: edits and redirects to the detail", async () => {
    const c = await makeCustomer(orgId, { name: "Velho Nome" });
    await expectRedirect(
      () => updateCustomer({}, cForm({ id: c.id, name: "Novo Nome" })),
      new RegExp(`/clientes/${c.id}\\?toast=customer-updated`),
    );
    const { data } = await admin().from("customers").select("name").eq("id", c.id).single();
    expect(data?.name).toBe("Novo Nome");
  });

  it("archiveCustomer / unarchiveCustomer toggle archived_at", async () => {
    const c = await makeCustomer(orgId);
    await expectRedirect(() => archiveCustomer(formData({ id: c.id })), /toast=customer-archived/);
    let { data } = await admin().from("customers").select("archived_at").eq("id", c.id).single();
    expect(data?.archived_at).not.toBeNull();

    await expectRedirect(
      () => unarchiveCustomer(formData({ id: c.id })),
      /toast=customer-unarchived/,
    );
    ({ data } = await admin().from("customers").select("archived_at").eq("id", c.id).single());
    expect(data?.archived_at).toBeNull();
  });

  it("listCustomers: search (name/email) + scope", async () => {
    await makeCustomer(orgId, { name: "Bruna Costa", email: "bruna@mail.com" });
    const archived = await makeCustomer(orgId, { name: "Carlos Dias" });
    await admin()
      .from("customers")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", archived.id);

    const active = await listCustomers();
    expect(active.map((c) => c.name)).toContain("Bruna Costa");
    expect(active.map((c) => c.id)).not.toContain(archived.id);

    expect((await listCustomers("bruna")).every((c) => /bruna/i.test(c.name + c.email))).toBe(true);
    expect((await listCustomers("bruna@mail")).length).toBeGreaterThan(0);
    expect((await listCustomers(undefined, "archived")).map((c) => c.id)).toContain(archived.id);
  });

  it("getCustomerWithHistory: returns customer + sales stats", async () => {
    const c = await makeCustomer(orgId, { name: "Diana" });
    const result = await getCustomerWithHistory(c.id);
    expect(result.customer?.name).toBe("Diana");
    expect(result.stats).toMatchObject({ totalSpent: 0, orderCount: 0, lastPurchase: null });
  });

  it("RLS: a customer of another org is not visible", async () => {
    const other = await makeUser();
    const otherOrg = await makeOrg(other.userId, "RESELLER");
    await makeCustomer(otherOrg.id, { name: "Segredo" });

    const mine = await listCustomers();
    expect(mine.map((c) => c.name)).not.toContain("Segredo");
  });
});
