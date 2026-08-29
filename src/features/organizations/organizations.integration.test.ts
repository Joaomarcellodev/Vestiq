import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeOrg, makeUser, supabaseUp } from "@/test/supabase";
import { clearTestClient, expectRedirect, setTestClient } from "@/test/actions";
import { RedirectError } from "@/test/next";
import {
  getActiveOrganization,
  listMyOrganizations,
  requireActiveOrganization,
  requireRole,
} from "./queries";
import { requireUser, getCurrentUser } from "@/features/auth/queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("organizations + auth guards (SPEC-002)", () => {
  let user: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    user = await makeUser();
    setTestClient(user.client);
  });
  afterEach(() => clearTestClient());

  it("listMyOrganizations / getActiveOrganization return the active membership", async () => {
    const org = await makeOrg(user.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica ACME");

    const list = await listMyOrganizations();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: org.id,
      name: "Fábrica ACME",
      type: "FACTORY",
      role: "FACTORY_ADMIN",
    });

    expect((await getActiveOrganization())?.id).toBe(org.id);
  });

  it("getActiveOrganization is null when the user has no ACTIVE membership", async () => {
    expect(await getActiveOrganization()).toBeNull();
  });

  it("requireActiveOrganization redirects to /aguardando-convite without an org", async () => {
    await expectRedirect(() => requireActiveOrganization(), "/aguardando-convite");
  });

  it("requireRole throws when the role does not match", async () => {
    await makeOrg(user.userId, "RESELLER", "RESELLER");
    await expect(requireRole("FACTORY_ADMIN")).rejects.toThrow(/não permitida/i);
  });

  it("requireRole passes for a matching role", async () => {
    await makeOrg(user.userId, "FACTORY", "FACTORY_ADMIN");
    await expect(requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN")).resolves.toMatchObject({
      role: "FACTORY_ADMIN",
    });
  });

  it("requireUser redirects to /login when signed out; getCurrentUser returns null", async () => {
    await user.client.auth.signOut({ scope: "local" });
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toBeInstanceOf(RedirectError);
  });

  it("DISABLED memberships are ignored", async () => {
    const org = await makeOrg(user.userId, "RESELLER", "RESELLER");
    await user.admin
      .from("organization_members")
      .update({ status: "DISABLED" })
      .eq("organization_id", org.id)
      .eq("user_id", user.userId);
    expect(await listMyOrganizations()).toHaveLength(0);
  });
});
