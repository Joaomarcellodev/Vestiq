import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES } from "./validation";

export const IMAGE_BUCKET = "product-images";

/**
 * Uploads photos to `product-images/<folder>/…` and returns their public URLs.
 * `folder` must start with the organization id — the storage policies
 * (migration 0014) only let members write under their own organization.
 */
export async function uploadImages(
  supabase: SupabaseClient<Database>,
  folder: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
      return { urls, error: "Envie imagens JPG, PNG ou WebP." };
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      return { urls, error: "Cada imagem deve ter no máximo 5 MB." };
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { urls, error: `Falha no upload da imagem: ${error.message}` };
    urls.push(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return { urls };
}

/** `…/storage/v1/object/public/product-images/<path>` → `<path>`. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

/**
 * Deletes photos from the bucket. Only logs on failure: a leftover file is an
 * orphan, not a reason to fail the user's save.
 */
export async function removeImages(supabase: SupabaseClient<Database>, urls: string[]) {
  const paths = urls.map(storagePathFromUrl).filter((p): p is string => p !== null);
  if (!paths.length) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error("image cleanup failed", error);
}

/** The photos the form kept, in its order, limited to the ones the record had. */
export function keptImages(raw: FormDataEntryValue | null, previous: string[]): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw as string) : [];
    return Array.isArray(parsed)
      ? parsed.filter((u): u is string => typeof u === "string" && previous.includes(u))
      : [];
  } catch {
    return [];
  }
}

export function readImageFiles(formData: FormData, max: number): File[] {
  return formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
    .slice(0, max);
}
