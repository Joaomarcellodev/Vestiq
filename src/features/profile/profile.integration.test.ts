import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeUser, supabaseUp, uniqueEmail } from "@/test/supabase";
import { clearTestClient, formData, pngFile, textFile, setTestClient } from "@/test/actions";
import { updateProfile } from "./actions";
import { getMyProfile } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("profile actions + queries (SPEC-001)", () => {
  let user: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    user = await makeUser();
    await makeOrg(user.userId, "RESELLER", "RESELLER", "Loja da Ana");
    setTestClient(user.client);
  });
  afterEach(() => clearTestClient());

  const pForm = (over: Record<string, unknown>) =>
    formData({ fullName: "Ana Souza", email: user.email, birthDate: "", ...over });

  it("updateProfile: saves name + birth date", async () => {
    const state = await updateProfile(
      {},
      pForm({ fullName: "Ana Maria Souza", birthDate: "1990-05-01" }),
    );
    expect(state.ok).toMatch(/perfil atualizado/i);

    const { data } = await admin()
      .from("profiles")
      .select("full_name, birth_date")
      .eq("id", user.userId)
      .single();
    expect(data?.full_name).toBe("Ana Maria Souza");
    expect(data?.birth_date).toBe("1990-05-01");
  });

  it("updateProfile: rejects a short name (zod)", async () => {
    expect((await updateProfile({}, pForm({ fullName: "A" }))).error).toMatch(/nome/i);
  });

  it("updateProfile: rejects a future birth date (zod)", async () => {
    expect((await updateProfile({}, pForm({ birthDate: "2999-01-01" }))).error).toMatch(/futuro/i);
  });

  it("updateProfile: uploads an avatar to the avatars bucket", async () => {
    const state = await updateProfile({}, pForm({ avatar: pngFile("me.png") }));
    expect(state.ok).toBeTruthy();
    const { data } = await admin()
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.userId)
      .single();
    expect(data?.avatar_url).toMatch(
      new RegExp(`/storage/v1/object/public/avatars/${user.userId}/`),
    );
  });

  it("updateProfile: replacing the avatar discards the previous file", async () => {
    await updateProfile({}, pForm({ avatar: pngFile("first.png") }));
    await updateProfile({}, pForm({ avatar: pngFile("second.png") }));

    const { data } = await admin().storage.from("avatars").list(user.userId);
    expect((data ?? []).filter((o) => o.name.startsWith("avatar-"))).toHaveLength(1);
  });

  it("updateProfile: removeAvatar clears the column and the bucket folder", async () => {
    await updateProfile({}, pForm({ avatar: pngFile("me.png") }));

    const state = await updateProfile({}, pForm({ removeAvatar: "1" }));
    expect(state.ok).toBeTruthy();

    const { data } = await admin()
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.userId)
      .single();
    expect(data?.avatar_url).toBeNull();

    const { data: objects } = await admin().storage.from("avatars").list(user.userId);
    expect((objects ?? []).filter((o) => o.name.startsWith("avatar-"))).toHaveLength(0);
  });

  it("getMyProfile: reports no avatar after the removal", async () => {
    await updateProfile({}, pForm({ avatar: pngFile("me.png") }));
    await updateProfile({}, pForm({ removeAvatar: "1" }));
    expect((await getMyProfile()).avatarUrl).toBeNull();
  });

  it("updateProfile: a new file wins over the removal flag", async () => {
    await updateProfile({}, pForm({ avatar: pngFile("me.png"), removeAvatar: "1" }));

    const { data } = await admin()
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.userId)
      .single();
    expect(data?.avatar_url).toMatch(
      new RegExp(`/storage/v1/object/public/avatars/${user.userId}/`),
    );
  });

  it("updateProfile: rejects a non-image avatar", async () => {
    expect((await updateProfile({}, pForm({ avatar: textFile() }))).error).toMatch(
      /JPG, PNG ou WebP/i,
    );
  });

  it("updateProfile: changing the email returns a confirmation note", async () => {
    const state = await updateProfile({}, pForm({ email: uniqueEmail("new") }));
    expect(state.ok).toMatch(/confirme o novo email/i);
  });

  it("getMyProfile: returns the stored profile", async () => {
    await updateProfile({}, pForm({ fullName: "Ana Q" }));
    const profile = await getMyProfile();
    expect(profile).toMatchObject({ id: user.userId, email: user.email, fullName: "Ana Q" });
  });
});
