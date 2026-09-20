/**
 * Codes bundled at build time from the shared VERIFIED coupon set (Trust
 * Law #1: only verified-working codes surfaced by default). Once the
 * backend `/codes` API (F3+F4) is live, this can be replaced with a fetch —
 * the shape stays `RankedCode[]` either way.
 */
// Imports from the `./fixtures` subpath (not the package's default export,
// which barrels in `deal-feed.ts`'s Node-only `fs`/`path` reads) so this stays
// bundleable for a browser extension context.
import { coupons } from "@coupon-app/shared/fixtures";
import type { RankedCode } from "./autoapply";

export const bundledVerifiedCodes: RankedCode[] = coupons
  .filter((coupon) => coupon.verifiedStatus === "verified")
  .map((coupon) => ({
    code: coupon.code,
    description: coupon.description,
    discountPercent: coupon.discountPercent,
    discountAmount: coupon.discountAmount,
  }));
