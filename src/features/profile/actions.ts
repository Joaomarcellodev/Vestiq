"use server";

import { revalidatePath } from "next/cache";
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

  // --- avatar (optional) --------------------------------------------------
  let avatarUrl: string | undefined;
  const file = formData.get("avatar");
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

    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  // --- profile row (created by the on_auth_user_created trigger) --------
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      birth_date: birthDate || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);
  if (profErr) return { error: profErr.message };

  // --- auth metadata + email ------------------------------------------
  const metadata: Record<string, unknown> = { full_name: fullName };
  if (avatarUrl) metadata.avatar_url = avatarUrl;
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
