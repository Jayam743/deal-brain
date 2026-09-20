import { describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { applyRankedCodes, findPromoField, runAutoApply, type RankedCode } from "./autoapply";

const CHECKOUT_HTML = `
  <form id="checkout">
    <label for="promoCode">Promo code</label>
    <input id="promoCode" name="promoCode" type="text" />
    <button type="submit">Apply</button>
    <div class="order-total">Total: $100.00</div>
  </form>
`;

const NO_FIELD_HTML = `
  <form id="checkout">
    <input id="email" name="email" type="email" />
  </form>
`;

function loadDocument(html: string): Document {
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

const codes: RankedCode[] = [
  { code: "SAVE10", description: "10% off", discountPercent: 10, discountAmount: null },
  { code: "SAVE25", description: "25% off", discountPercent: 25, discountAmount: null },
  { code: "SAVE5", description: "$5 off", discountPercent: null, discountAmount: 5 },
];

describe("findPromoField", () => {
  it("locates a promo input via its label + attributes", () => {
    const doc = loadDocument(CHECKOUT_HTML);
    const field = findPromoField(doc);
    expect(field?.id).toBe("promoCode");
  });

  it("returns null when no promo-like field exists on the page", () => {
    const doc = loadDocument(NO_FIELD_HTML);
    expect(findPromoField(doc)).toBeNull();
  });
});

describe("applyRankedCodes", () => {
  it("tries codes in rank order (largest discount first) and keeps the best", async () => {
    const doc = loadDocument(CHECKOUT_HTML);
    const field = findPromoField(doc)!;
    const attemptOrder: (string | null)[] = [];

    // Totals that don't line up with rank order: SAVE25 only gets to $85,
    // SAVE10 (tried after) gets to $80 — the engine should still keep
    // SAVE10 as the best, not just the first one that lowers the total.
    const totals: Record<string, number> = { SAVE25: 85, SAVE10: 80, SAVE5: 95 };

    const applyAndReadTotal = async (code: string | null) => {
      attemptOrder.push(code);
      if (code === null) return 100;
      return totals[code] ?? null;
    };

    const result = await applyRankedCodes(field, codes, applyAndReadTotal);

    // SAVE10 wins but isn't the last one tried, so the engine re-applies it
    // before returning, leaving the checkout in the best-known state.
    expect(attemptOrder).toEqual([null, "SAVE25", "SAVE10", "SAVE5", "SAVE10"]);
    expect(result).toEqual({
      status: "applied",
      appliedCode: "SAVE10",
      savings: 20,
      triedCount: 3,
    });
    expect(field.value).toBe("SAVE10");
  });

  it("returns the ranked list for one-tap when no code lowers the total", async () => {
    const doc = loadDocument(CHECKOUT_HTML);
    const field = findPromoField(doc)!;

    const applyAndReadTotal = async (code: string | null) => (code === null ? 100 : 100);

    const result = await applyRankedCodes(field, codes, applyAndReadTotal);

    expect(result.status).toBe("no-match");
    if (result.status === "no-match") {
      expect(result.triedCount).toBe(3);
      expect(result.ranked.map((c) => c.code)).toEqual(["SAVE25", "SAVE10", "SAVE5"]);
    }
  });
});

describe("runAutoApply", () => {
  it("returns the ranked list without trying anything when no promo field is found", async () => {
    const doc = loadDocument(NO_FIELD_HTML);
    let calls = 0;
    const applyAndReadTotal = async () => {
      calls += 1;
      return 100;
    };

    const result = await runAutoApply(doc, codes, applyAndReadTotal);

    expect(calls).toBe(0);
    expect(result.status).toBe("no-field");
    if (result.status === "no-field") {
      expect(result.ranked.map((c) => c.code)).toEqual(["SAVE25", "SAVE10", "SAVE5"]);
    }
  });

  it("delegates to applyRankedCodes when a field is found", async () => {
    const doc = loadDocument(CHECKOUT_HTML);
    const applyAndReadTotal = async (code: string | null) =>
      code === "SAVE25" ? 75 : code === null ? 100 : null;

    const result = await runAutoApply(doc, codes, applyAndReadTotal);

    expect(result).toEqual({
      status: "applied",
      appliedCode: "SAVE25",
      savings: 25,
      triedCount: 3,
    });
  });
});
