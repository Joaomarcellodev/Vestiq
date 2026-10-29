import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import type { ReviewKind } from "./validation";

export interface Review {
  rating: number;
  comment: string | null;
  createdAt: string;
}

/**
 * VES-42 — the reviews of one transaction, as its parties see them (RLS:
 * `reviews_select_parties`): the one the active org wrote and the one it got.
 */
export async function getTransactionReviews(
  kind: ReviewKind,
  transactionId: string,
): Promise<{ mine: Review | null; received: Review | null }> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("reviewer_org_id, rating, comment, created_at")
    .eq(kind === "negotiation" ? "negotiation_id" : "supply_order_id", transactionId);
  if (error) throw error;

  const toReview = (row: (typeof data)[number] | undefined): Review | null =>
    row ? { rating: row.rating, comment: row.comment, createdAt: row.created_at } : null;
  return {
    mine: toReview(data.find((r) => r.reviewer_org_id === org.id)),
    received: toReview(data.find((r) => r.reviewer_org_id !== org.id)),
  };
}
