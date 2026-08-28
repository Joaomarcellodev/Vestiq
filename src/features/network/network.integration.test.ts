import { beforeAll, describe, expect, it } from "vitest";
import { admin, makeOrg, makeUser, supabaseUp } from "@/test/supabase";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("organization identity visibility (migration 0010)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const db = admin();
    const factoryUser = await makeUser();
    const factory = await makeOrg(factoryUser.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Z");

    const rA = await makeUser();
    const orgA = await makeOrg(rA.userId, "RESELLER", "RESELLER", "Loja A");
    const rB = await makeUser();
    const orgB = await makeOrg(rB.userId, "RESELLER", "RESELLER", "Loja B");
    const outsider = await makeUser();
    const orgOut = await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Loja Fora");

    const { data: network } = await db
      .from("factory_networks")
      .insert({ factory_id: factory.id, name: "Rede Z" })
      .select()
      .single();
    for (const org of [orgA, orgB]) {
      await db.from("network_members").insert({
        network_id: network!.id,
        reseller_id: org.id,
        invited_email: `${org.id}@z.test`,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
      });
    }

    return { factoryUser, factory, rA, orgA, rB, orgB, outsider, orgOut };
  }

  beforeAll(async () => {
    ctx = await setup();
  });

  it("lets a factory admin read the names of its network resellers", async () => {
    const { data } = await ctx.factoryUser.client
      .from("organizations")
      .select("name")
      .eq("id", ctx.orgA.id)
      .maybeSingle();
    expect(data?.name).toBe("Loja A");
  });

  it("lets a reseller read a network peer's name", async () => {
    const { data } = await ctx.rA.client
      .from("organizations")
      .select("name")
      .eq("id", ctx.orgB.id)
      .maybeSingle();
    expect(data?.name).toBe("Loja B");
  });

  it("still hides an unrelated organization", async () => {
    const { data } = await ctx.rA.client
      .from("organizations")
      .select("name")
      .eq("id", ctx.orgOut.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("does not leak reseller operational data across the network", async () => {
    // orgB has no products; but the point is A cannot even query B's product table rows
    await admin().from("products").insert({ organization_id: ctx.orgB.id, name: "Secreto" });
    const { data } = await ctx.rA.client
      .from("products")
      .select("id")
      .eq("organization_id", ctx.orgB.id);
    expect(data ?? []).toHaveLength(0);
  });
});
