// Offer feed search (SPEC-008, US-OFFER-02) — same rule as the supplier search
// (migration 0017): every word of the query must appear, case/accent-insensitive.

export type SearchableOffer = {
  productName: string;
  brand: string | null;
  descriptor: string;
  sellerName: string;
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** The query trimmed, or `undefined` when there is nothing to search for. */
export function cleanOfferQuery(query?: string): string | undefined {
  const q = query?.trim();
  return q ? q : undefined;
}

export function matchesOfferQuery(offer: SearchableOffer, query?: string): boolean {
  const q = cleanOfferQuery(query);
  if (!q) return true;
  const haystack = normalize(
    [offer.productName, offer.brand, offer.descriptor, offer.sellerName].filter(Boolean).join(" "),
  );
  return normalize(q)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
