/**
 * Pure, DOM-agnostic auto-apply engine (F6). No hidden tabs, no
 * affiliate-cookie manipulation — the caller supplies the actual
 * "apply + read total" side effect (`ApplyAndReadTotal`); this module only
 * decides *which* field to use and *which* code wins.
 */

/** A candidate coupon code, ranked by discount. Mirrors the shape of
 * `@coupon-app/shared`'s `Coupon`, trimmed to what the engine needs. */
export interface RankedCode {
  code: string;
  description: string;
  discountPercent: number | null;
  discountAmount: number | null;
}

export type AutoApplyResult =
  | { status: "applied"; appliedCode: string; savings: number; triedCount: number }
  | { status: "no-match"; ranked: RankedCode[]; triedCount: number }
  | { status: "no-field"; ranked: RankedCode[] };

/**
 * Applies a code (or, when `code` is `null`, reads the current total with no
 * code applied — a baseline read) and returns the resulting cart/order total,
 * or `null` if the code was rejected / the total couldn't be determined.
 */
export type ApplyAndReadTotal = (code: string | null) => Promise<number | null>;

const PROMO_TEXT_PATTERN = /promo|coupon|discount/i;

const INELIGIBLE_INPUT_TYPES = new Set([
  "hidden",
  "checkbox",
  "radio",
  "submit",
  "button",
  "file",
  "image",
  "reset",
]);

function textMatches(value: string | null | undefined): boolean {
  return Boolean(value && PROMO_TEXT_PATTERN.test(value));
}

function isEligibleInput(input: HTMLInputElement): boolean {
  const type = (input.getAttribute("type") ?? "text").toLowerCase();
  if (INELIGIBLE_INPUT_TYPES.has(type)) return false;
  if (input.disabled) return false;
  return true;
}

function labelTextFor(input: HTMLInputElement, doc: Document): string | null {
  const id = input.id;
  if (id) {
    const matched = Array.from(doc.querySelectorAll("label")).find(
      (label) => label.getAttribute("for") === id,
    );
    if (matched?.textContent) return matched.textContent;
  }
  return input.closest("label")?.textContent ?? null;
}

/**
 * Locates a promo/coupon-code input on a checkout page. MutationObserver-
 * friendly: this is a plain query, safe to re-run on every DOM mutation for
 * SPA checkouts that render the field late. Matches on the input's own
 * name/id/placeholder/aria-label first, then falls back to an associated
 * `<label>`'s text.
 */
export function findPromoField(doc: Document): HTMLInputElement | null {
  const inputs = Array.from(doc.querySelectorAll("input")).filter(isEligibleInput);

  const byAttribute = inputs.find(
    (input) =>
      textMatches(input.getAttribute("name")) ||
      textMatches(input.getAttribute("id")) ||
      textMatches(input.getAttribute("placeholder")) ||
      textMatches(input.getAttribute("aria-label")),
  );
  if (byAttribute) return byAttribute;

  return inputs.find((input) => textMatches(labelTextFor(input, doc))) ?? null;
}

function rankValue(code: RankedCode): number {
  return code.discountPercent ?? code.discountAmount ?? 0;
}

/** Largest discount first (R-18). Ties keep their original relative order. */
export function rankCodes(codes: RankedCode[]): RankedCode[] {
  return [...codes].sort((a, b) => rankValue(b) - rankValue(a));
}

function setFieldValue(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Tries ranked codes in order, keeping whichever one produces the lowest
 * total (not just the first one that "works" — site quirks like minimum-cart
 * exclusions mean rank order doesn't guarantee the biggest listed discount
 * is the biggest actual saving). Returns the ranked list instead, for
 * one-tap copy, when no code beats the baseline total.
 */
export async function applyRankedCodes(
  field: HTMLInputElement,
  codes: RankedCode[],
  applyAndReadTotal: ApplyAndReadTotal,
): Promise<AutoApplyResult> {
  const ranked = rankCodes(codes);
  const baseline = await applyAndReadTotal(null);

  if (baseline === null || ranked.length === 0) {
    return { status: "no-match", ranked, triedCount: 0 };
  }

  let triedCount = 0;
  let best: { code: RankedCode; total: number } | null = null;
  let lastTriedCode: string | null = null;

  for (const code of ranked) {
    setFieldValue(field, code.code);
    lastTriedCode = code.code;
    triedCount += 1;
    const total = await applyAndReadTotal(code.code);
    if (total !== null && total < baseline && (best === null || total < best.total)) {
      best = { code, total };
    }
  }

  if (!best) {
    return { status: "no-match", ranked, triedCount };
  }

  if (lastTriedCode !== best.code.code) {
    // A later, worse try overwrote the field — leave checkout applied to
    // the winner rather than whatever was tried last.
    setFieldValue(field, best.code.code);
    await applyAndReadTotal(best.code.code);
  }

  return {
    status: "applied",
    appliedCode: best.code.code,
    savings: Number((baseline - best.total).toFixed(2)),
    triedCount,
  };
}

/** Full flow: find the field, then try codes against it. Returns the
 * one-tap ranked list directly when no promo field is found at all. */
export async function runAutoApply(
  doc: Document,
  codes: RankedCode[],
  applyAndReadTotal: ApplyAndReadTotal,
): Promise<AutoApplyResult> {
  const field = findPromoField(doc);
  if (!field) {
    return { status: "no-field", ranked: rankCodes(codes) };
  }
  return applyRankedCodes(field, codes, applyAndReadTotal);
}
