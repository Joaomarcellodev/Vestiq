// Offer feed search (SPEC-008, US-OFFER-02). The matching itself runs in SQL —
// `list_visible_offers(p_query)` (migration 0039), with the supplier search's
// rule (migration 0017): every word of the query must appear, case/accent-insensitive.

/** The query trimmed, or `undefined` when there is nothing to search for. */
export function cleanOfferQuery(query?: string): string | undefined {
  const q = query?.trim();
  return q ? q : undefined;
}
