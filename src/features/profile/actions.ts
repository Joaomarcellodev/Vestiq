"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/queries";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, profileSchema } from "./validation";

export type ProfileState = { error?: string; ok?: string };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const supabase = await createClient();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    birthDate: formData.get("birthDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { fullName, email, birthDate } = parsed.data;

  // --- avatar (opcional) --------------------------------------------------
  // `undefined` = não mexer; `null` = remover; string = nova foto.
  let avatarUrl: string | null | undefined;
  const file = formData.get("avatar");
  const removeAvatar = formData.get("removeAvatar") === "1";

  if (file instanceof File && file.size > 0) {
    if (!AVATAR_TYPES.includes(file.type)) {
      return { error: "Envie uma imagem JPG, PNG ou WebP." };
    }
    if (file.size > AVATAR_MAX_BYTES) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return { error: `Falha no upload da foto: ${upErr.message}` };

    // O nome do arquivo carrega um timestamp, então as fotos antigas ficariam
    // órfãs no bucket para sempre.
    await discardStoredAvatars(supabase, user.id, path);
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } else if (removeAvatar) {
    await discardStoredAvatars(supabase, user.id);
    avatarUrl = null;
  }

  // --- profile row (created by the on_auth_user_created trigger) --------
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      birth_date: birthDate || null,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);
  if (profErr) return { error: profErr.message };

  // --- auth metadata + email ------------------------------------------
  const metadata: Record<string, unknown> = { full_name: fullName };
  if (avatarUrl !== undefined) {
    metadata.avatar_url = avatarUrl;
    // `getMyProfile` cai para `picture` (foto vinda do login social) quando não
    // há avatar próprio — sem limpar isso, "remover" não removeria nada.
    if (avatarUrl === null) metadata.picture = null;
  }
  await supabase.auth.updateUser({ data: metadata });

  let emailNote = "";
  if (email && email !== user.email) {
    const { error: emailErr } = await supabase.auth.updateUser({ email });
    emailNote = emailErr
      ? " (não foi possível atualizar o email)"
      : " Confirme o novo email pela mensagem que enviamos.";
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: `Perfil atualizado.${emailNote}` };
}

/** Apaga os arquivos do usuário no bucket `avatars`, exceto `keep`. */
async function discardStoredAvatars(
  supabase: SupabaseClient,
  userId: string,
  keep?: string,
): Promise<void> {
  const { data } = await supabase.storage.from("avatars").list(userId);
  const paths = (data ?? []).map((obj) => `${userId}/${obj.name}`).filter((p) => p !== keep);
  if (paths.length) await supabase.storage.from("avatars").remove(paths);
}
