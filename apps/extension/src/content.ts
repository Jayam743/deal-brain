/**
 * Checkout content script (F6 / S3.3). Watches a supported checkout page for
 * a promo field (SPA-safe via MutationObserver), runs the ranked-code
 * auto-apply engine against it, and renders a minimal overlay with the
 * verdict + ranked codes for one-tap copy. No hidden tabs, no
 * affiliate-cookie manipulation (Trust Law).
 */
import {
  findPromoField,
  runAutoApply,
  type ApplyAndReadTotal,
  type AutoApplyResult,
} from "./autoapply";
import { bundledVerifiedCodes } from "./coupon-codes";

const OVERLAY_ID = "deal-brain-overlay";
const TOTAL_SELECTOR =
  '[data-testid*="order-total" i], [class*="order-total" i], [id*="order-total" i], ' +
  '[class*="grand-total" i], [id*="grand-total" i], [class*="summary-total" i]';

function readTotalFromDom(): number | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(TOTAL_SELECTOR))) {
    const match = el.textContent?.match(/\$([0-9]{1,6}(?:\.[0-9]{1,2})?)/);
    const value = match?.[1] ? Number(match[1]) : NaN;
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function clickApplyButton(field: HTMLInputElement): void {
  const scope: ParentNode = field.closest("form") ?? document;
  scope
    .querySelector<HTMLButtonElement>(
      'button[type="submit"], button[class*="apply" i], button[aria-label*="apply" i]',
    )
    ?.click();
}

const applyAndReadTotal: ApplyAndReadTotal = async (code) => {
  if (code !== null) {
    const field = findPromoField(document);
    if (field) clickApplyButton(field);
    // Give the page's own JS a tick to recompute the total after "Apply".
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return readTotalFromDom();
};

function renderOverlay(result: AutoApplyResult): void {
  document.getElementById(OVERLAY_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute(
    "style",
    "position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#111;color:#fff;" +
      "font:13px system-ui,sans-serif;border-radius:8px;padding:12px;max-width:280px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.3);",
  );

  const heading = document.createElement("div");
  heading.style.fontWeight = "600";
  heading.style.marginBottom = "6px";
  heading.textContent = "Deal Brain";
  overlay.appendChild(heading);

  const verdict = document.createElement("div");
  verdict.textContent =
    result.status === "applied"
      ? `Applied ${result.appliedCode} — saved $${result.savings.toFixed(2)}`
      : result.status === "no-match"
        ? "No code lowered your total. Try one below:"
        : "Couldn't find a promo field. Try a code below:";
  overlay.appendChild(verdict);

  if (result.status !== "applied") {
    const list = document.createElement("ul");
    list.setAttribute("style", "list-style:none;margin:8px 0 0;padding:0;");
    for (const ranked of result.ranked) {
      const item = document.createElement("li");
      item.setAttribute(
        "style",
        "display:flex;justify-content:space-between;gap:8px;padding:4px 0;",
      );
      const label = document.createElement("span");
      label.textContent = ranked.code;
      const copy = document.createElement("button");
      copy.textContent = "Copy";
      copy.setAttribute("style", "cursor:pointer;");
      copy.addEventListener("click", () => {
        void navigator.clipboard.writeText(ranked.code);
      });
      item.append(label, copy);
      list.appendChild(item);
    }
    overlay.appendChild(list);
  }

  document.body.appendChild(overlay);
}

let hasRun = false;

async function tryAutoApply(): Promise<void> {
  if (hasRun) return;
  if (!findPromoField(document)) return;
  hasRun = true;
  const result = await runAutoApply(document, bundledVerifiedCodes, applyAndReadTotal);
  renderOverlay(result);
}

const observer = new MutationObserver(() => {
  void tryAutoApply();
});
observer.observe(document.body, { childList: true, subtree: true });

void tryAutoApply();
