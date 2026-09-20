import type { StoreSlug } from "@coupon-app/shared";

/**
 * Best-effort retailer detection from free text — a DealNews `retailer`
 * field, or a Slickdeals title/description. Returns null rather than
 * guessing when nothing recognizable is present; never fabricate a store
 * match just to fill the field.
 */
export function detectStoreSlug(text: string | null | undefined): StoreSlug | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (/best\s*buy/.test(normalized)) return "best_buy";
  if (/walmart/.test(normalized)) return "walmart";
  if (/\bamazon\b/.test(normalized)) return "amazon";
  if (/micro\s*center|microcenter/.test(normalized)) return "micro_center";
  return null;
}
