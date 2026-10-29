"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { reviewSchema, transactionPath } from "./validation";

export type ReviewState = { error?: string };

/** VES-42 — rate the other party of a finished transaction (`submit_review`, migration 0045). */
export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireActiveOrganization();
  const parsed = reviewSchema.safeParse({
    kind: formData.get("kind"),
    transactionId: formData.get("transactionId"),
    rating: formData.get("rating") ?? undefined,
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { kind, transactionId, rating, comment } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_rating: rating,
    p_negotiation_id: kind === "negotiation" ? transactionId : undefined,
    p_supply_order_id: kind === "supply_order" ? transactionId : undefined,
    p_comment: comment || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };

  const path = transactionPath(kind, transactionId);
  revalidatePath(path);
  redirect(`${path}?toast=review-submitted`);
}
