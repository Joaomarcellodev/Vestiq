/** Brazilian phone numbers — VES-80. Stored as digits, shown with the mask. */

/** DDD + number: 10 digits (landline) or 11 (mobile, starting with 9). */
export function isValidPhone(raw: string): boolean {
  if (/[^\d\s()+-]/.test(raw)) return false;
  const digits = raw.replace(/\D/g, "");
  if (!/^[1-9]{2}/.test(digits)) return false;
  if (digits.length === 10) return true;
  return digits.length === 11 && digits[2] === "9";
}

/**
 * Masks while typing: "11987654321" → "(11) 98765-4321", "1134567890" →
 * "(11) 3456-7890". Anything that isn't a phone (an old free-text value) is
 * returned unchanged, so it still shows.
 */
export function formatPhone(raw: string): string {
  if (/[^\d\s()+-]/.test(raw)) return raw;
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const split = d.length === 11 ? 7 : 6;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}
