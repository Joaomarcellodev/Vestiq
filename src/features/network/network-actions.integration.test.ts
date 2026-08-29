import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeUser, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  inviteMember,
  makeNetwork,
  setTestClient,
} from "@/test/actions";
import { acceptInvite, createNetwork, inviteReseller, setMemberActive } from "./actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("network actions (SPEC-003)", () => {
  let factory: Awaited<ReturnType<typeof makeUser>>;
  let factoryOrgId: string;

  beforeEach(async () => {
    factory = await makeUser();
    factoryOrgId = (await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica R")).id;
    setTestClient(factory.client);
  });
  afterEach(() => clearTestClient());

  it("createNetwork: factory admin only", async () => {
    const ok = await createNetwork({}, formData({ name: "Minha Rede" }));
    expect(ok.ok).toBe(true);
    const { data } = await admin()
      .from("factory_networks")
      .select("name")
      .eq("factory_id", factoryOrgId);
    expect(data?.map((n) => n.name)).toContain("Minha Rede");
  });

  it("createNetwork: rejected for a reseller (role guard)", async () => {
    const reseller = await makeUser();
    await makeOrg(reseller.userId, "RESELLER", "RESELLER");
    setTestClient(reseller.client);
    await expect(createNetwork({}, formData({ name: "X" }))).rejects.toThrow(/não permitida/i);
  });

  it("createNetwork: rejects a blank name (zod)", async () => {
    expect((await createNetwork({}, formData({ name: "" }))).error).toMatch(/nome da rede/i);
  });

  it("inviteReseller: creates an INVITED member row", async () => {
    const network = await makeNetwork(factoryOrgId);
    const first = await inviteReseller(
      {},
      formData({ networkId: network.id, email: "nova@loja.com" }),
    );
    expect(first.ok).toBe(true);

    const { data } = await admin()
      .from("network_members")
      .select("status, invited_email")
      .eq("network_id", network.id);
    expect(data?.[0]).toMatchObject({ status: "INVITED", invited_email: "nova@loja.com" });

    // NOTE: there is no unique constraint on (network_id, invited_email) for
    // pending invites, so a second invite to the same email currently succeeds.
    // The action's 23505 "já foi convidada" branch is therefore unreachable today.
    const dup = await inviteReseller(
      {},
      formData({ networkId: network.id, email: "nova@loja.com" }),
    );
    expect(dup.ok).toBe(true);
  });

  it("inviteReseller: rejects a malformed email (zod)", async () => {
    const network = await makeNetwork(factoryOrgId);
    expect(
      (await inviteReseller({}, formData({ networkId: network.id, email: "bad" }))).error,
    ).toMatch(/email/i);
  });

  it("setMemberActive: toggles ACTIVE ↔ DISABLED and stamps joined_at", async () => {
    const network = await makeNetwork(factoryOrgId);
    const reseller = await makeUser();
    const resellerOrg = await makeOrg(reseller.userId, "RESELLER", "RESELLER");
    const member = await addMember(network.id, resellerOrg.id, "ACTIVE");

    await setMemberActive(formData({ memberId: member.id, active: "false" }));
    const disabled = await admin()
      .from("network_members")
      .select("status, joined_at")
      .eq("id", member.id)
      .single();
    expect(disabled.data?.status).toBe("DISABLED");

    await setMemberActive(formData({ memberId: member.id, active: "true" }));
    const reactivated = await admin()
      .from("network_members")
      .select("status, joined_at")
      .eq("id", member.id)
      .single();
    expect(reactivated.data?.status).toBe("ACTIVE");
    expect(reactivated.data?.joined_at).not.toBeNull();
  });

  it("setMemberActive: rejected for a non-admin", async () => {
    const network = await makeNetwork(factoryOrgId);
    const reseller = await makeUser();
    const resellerOrg = await makeOrg(reseller.userId, "RESELLER", "RESELLER");
    const member = await addMember(network.id, resellerOrg.id, "ACTIVE");

    setTestClient(reseller.client);
    await expect(
      setMemberActive(formData({ memberId: member.id, active: "false" })),
    ).rejects.toThrow(/não permitida/i);
  });

  describe("acceptInvite", () => {
    it("accepts a valid invite, creates the reseller org, redirects", async () => {
      const network = await makeNetwork(factoryOrgId, "Rede Convite");
      const invitee = await makeUser();
      const invite = await inviteMember(network.id, invitee.email);

      setTestClient(invitee.client);
      await expectRedirect(
        () => acceptInvite({}, formData({ token: invite.invite_token, resellerName: "Loja Nova" })),
        "/dashboard?toast=network-joined",
      );

      const { data: member } = await admin()
        .from("network_members")
        .select("status, reseller_id")
        .eq("id", invite.id)
        .single();
      expect(member?.status).toBe("ACTIVE");
      const { data: org } = await admin()
        .from("organizations")
        .select("name, type")
        .eq("id", member!.reseller_id!)
        .single();
      expect(org).toMatchObject({ name: "Loja Nova", type: "RESELLER" });
    });

    it("rejects an invite meant for another email", async () => {
      const network = await makeNetwork(factoryOrgId);
      const invite = await inviteMember(network.id, "someone-else@x.com");
      const invitee = await makeUser();
      setTestClient(invitee.client);
      const state = await acceptInvite(
        {},
        formData({ token: invite.invite_token, resellerName: "" }),
      );
      expect(state.error).toMatch(/outro email/i);
    });

    it("rejects a malformed token (zod)", async () => {
      const invitee = await makeUser();
      setTestClient(invitee.client);
      const state = await acceptInvite({}, formData({ token: "not-a-uuid", resellerName: "" }));
      expect(state.error).toMatch(/convite inválido/i);
    });
  });
});
