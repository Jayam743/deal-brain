/** Strips HTML tags and decodes the handful of entities DealNews/Slickdeals
 * descriptions use, so the price/discount parsers below aren't confused by
 * markup. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts the last dollar figure mentioned in free text (Slickdeals titles
 * put the final sale price near the end, e.g. "... $8.50"). Returns null —
 * never a fabricated guess — when nothing parses.
 */
export function parsePriceFromText(text: string): number | null {
  const matches = [...text.matchAll(/\$([0-9]{1,6}(?:\.[0-9]{1,2})?)/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1]?.[1];
  if (!last) return null;
  const value = Number(last.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** Extracts a "12% off" / "12% savings" style discount mention, or null. */
export function parseDiscountPercentFromText(text: string): number | null {
  const match = text.match(/(\d{1,3})%\s*(?:off|savings|discount)/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
}
