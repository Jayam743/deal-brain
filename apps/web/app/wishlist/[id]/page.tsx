import {
  computeVerdict,
  coupons,
  currentPrices,
  NOW,
  priceHistories,
  products,
  stores,
  wishlistItems,
  type Coupon,
  type Product,
  type StoreRetailer,
} from "@coupon-app/shared";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyCodeButton } from "@/components/copy-code-button";
import { ArrowLeftIcon } from "@/components/nav-icons";
import { Sparkline } from "@/components/sparkline";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatMoney, formatRelativeTime } from "@/lib/format";
import { buildStoreSearchLink } from "@/lib/store-search";

function thresholdLabel(item: { thresholdType: "percent" | "absolute"; thresholdValue: number }) {
  return item.thresholdType === "percent"
    ? `alert at −${item.thresholdValue}%`
    : `alert below ${formatMoney(item.thresholdValue)}`;
}

/**
 * There's no store_listings fixture yet linking a product to the retailers
 * that carry it — but the product record already carries per-retailer
 * identifiers (Best Buy SKU, Walmart WPID, Amazon ASIN; see the wishlist
 * page's own "tracked by identifier" copy). We use *only* those explicit
 * fields to infer store availability — never a guess, never Micro Center
 * (which has no identifier field on Product at all).
 */
function storesForProduct(product: Product): StoreRetailer[] {
  const ids = new Set<string>();
  if (product.sku) ids.add("store-bestbuy");
  if (product.wpid) ids.add("store-walmart");
  if (product.asin) ids.add("store-amazon");
  return stores.filter((store) => ids.has(store.id));
}

/**
 * Matching coupons are either tied to this exact product, or a store-wide
 * code for a store known (via storesForProduct) to carry it. Quarantined
 * codes are excluded — same "hidden by default" honesty rule as the
 * dashboard's verified-code count.
 */
function matchingCoupons(product: Product): Coupon[] {
  const storeIds = new Set(storesForProduct(product).map((s) => s.id));
  return coupons.filter((coupon) => {
    if (coupon.verifiedStatus === "quarantined") return false;
    if (coupon.productId === product.id) return true;
    return coupon.productId === null && storeIds.has(coupon.storeRetailerId);
  });
}

/**
 * A coupon is store-scoped via its own storeRetailerId — never inferred from
 * the code string. If that id doesn't resolve (fixture gap), we fall back to
 * the wishlist product's primary tracked store; buildStoreSearchLink already
 * falls back further to a plain web search when no store is known at all.
 */
function couponStore(coupon: Coupon, availableAt: StoreRetailer[]): StoreRetailer | undefined {
  return stores.find((store) => store.id === coupon.storeRetailerId) ?? availableAt[0];
}

export function generateStaticParams() {
  return wishlistItems.map((item) => ({ id: item.id }));
}

export default async function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = wishlistItems.find((w) => w.id === id);
  if (!item) notFound();

  const product = products.find((p) => p.id === item.productId);
  if (!product) notFound();

  const history = priceHistories[product.id] ?? [];
  const currentPrice = currentPrices[product.id] ?? 0;
  const verdict = computeVerdict(currentPrice, history, NOW);
  const availableAt = storesForProduct(product);
  const codes = matchingCoupons(product);

  return (
    <div>
      <Link
        href="/wishlist"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text)]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to wishlist
      </Link>

      <div className="surface-panel px-7 py-8">
        <div className="text-xs text-[color:var(--color-text-muted)]">
          {product.brand ? `${product.brand} · ` : ""}
          {product.category}
        </div>

        <h1 className="font-display mt-2 max-w-2xl text-2xl leading-snug tracking-tight sm:text-3xl">
          {product.title}
        </h1>

        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <VerdictBadge verdict={verdict} size="lg" />
          {history.length > 1 ? (
            <Sparkline
              data={history.map((h) => h.price)}
              width={280}
              height={72}
              area
              showRange
              rangeUnit="currency"
            />
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-8 border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <div className="text-xs text-[color:var(--color-text-muted)]">current price</div>
            <div className="tabular mt-1 font-mono text-2xl font-semibold">
              {formatMoney(currentPrice)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--color-text-muted)]">threshold</div>
            <div className="mt-1 text-sm font-medium">{thresholdLabel(item)}</div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--color-text-muted)]">tracking since</div>
            <div className="mt-1 text-sm font-medium">{formatRelativeTime(item.createdAt)}</div>
          </div>
        </div>
      </div>

      <section className="surface-panel mt-6 px-7 py-7">
        <h2 className="text-sm font-semibold">Price across stores</h2>
        {availableAt.length > 1 ? (
          <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
            Listed by identifier at {availableAt.map((s) => s.name).join(", ")} — but priced by a
            single daily logger, not a per-store feed yet.
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-2 text-sm text-[color:var(--color-text-muted)]">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--color-caution)" }}
          />
          tracked at 1 store — no cross-store price comparison yet.
        </div>
        <div className="tabular mt-3 font-mono text-lg font-semibold">
          {formatMoney(currentPrice)}
        </div>
      </section>

      <section className="surface-panel mt-6 px-7 py-7">
        <h2 className="text-sm font-semibold">Matching coupon codes</h2>
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          Sample codes — not live yet; won&apos;t work at checkout.
        </p>
        {codes.length === 0 ? (
          <div className="mt-3 text-sm text-[color:var(--color-text-muted)]">
            No coupon codes tracked for this product yet.
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {codes.map((coupon) => {
              const store = couponStore(coupon, availableAt);
              // Sample product IDs are placeholders → a /dp/<id> deep-link would 404.
              // Use store search until real product IDs are ingested (e.g. Best Buy
              // API skuIds), then switch to buildStoreProductLink.
              const searchLink = buildStoreSearchLink(product.title, store?.slug ?? null);
              const openLabel = store ? `Open ${store.name} →` : searchLink.label;
              return (
                <li
                  key={coupon.id}
                  className="flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ background: "var(--color-surface-raised)" }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{coupon.code}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background:
                            coupon.verifiedStatus === "verified"
                              ? "var(--color-accent-soft)"
                              : "var(--color-caution-soft)",
                          color:
                            coupon.verifiedStatus === "verified"
                              ? "var(--color-accent)"
                              : "var(--color-caution)",
                        }}
                      >
                        {coupon.verifiedStatus}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {coupon.description}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {coupon.successRate !== null
                        ? `${Math.round(coupon.successRate * 100)}% success (${coupon.successCount}/${coupon.totalVotes})`
                        : "not enough votes yet"}
                      {coupon.lastVerifiedAt
                        ? ` · last verified ${formatRelativeTime(coupon.lastVerifiedAt)}`
                        : " · never verified"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyCodeButton code={coupon.code} />
                    <a
                      href={searchLink.href}
                      target="_blank"
                      rel="noopener"
                      className="rounded-full border px-3 py-1 text-xs font-medium text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text)]"
                    >
                      {openLabel}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
