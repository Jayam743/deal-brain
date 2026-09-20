/**
 * Domain types for Deal Brain, mirroring the app's data model (products,
 * prices, coupons, wishlist, deal feed).
 */

export type StoreSlug = "best_buy" | "walmart" | "amazon" | "micro_center";

export type StoreRole = "tracked" | "awareness";

export interface StoreRetailer {
  id: string;
  slug: StoreSlug;
  name: string;
  role: StoreRole;
}

export interface StoreLocation {
  id: string;
  storeRetailerId: string;
  externalLocationId: string;
  zip: string;
  city: string;
  state: string;
}

export interface Product {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  /** Universal Product Code / Global Trade Item Number, when known. */
  upc: string | null;
  gtin: string | null;
  /** Amazon Standard Identification Number, when known (awareness-only). */
  asin: string | null;
  /** Walmart Product ID. */
  wpid: string | null;
  /** Generic retailer SKU. */
  sku: string | null;
}

export interface StoreListing {
  id: string;
  productId: string;
  storeRetailerId: string;
  externalUrl: string;
  externalId: string;
}

export interface Price {
  id: string;
  storeListingId: string;
  price: number;
  currency: "USD";
  wasPrice: number | null;
  capturedAt: string;
}

export interface StoreInventory {
  id: string;
  storeListingId: string;
  storeLocationId: string;
  inStock: boolean;
  quantity: number | null;
  checkedAt: string;
}

export type CodeVerifiedStatus = "verified" | "unverified" | "quarantined";

export interface Coupon {
  id: string;
  storeRetailerId: string;
  productId: string | null;
  code: string;
  description: string;
  discountPercent: number | null;
  discountAmount: number | null;
  verifiedStatus: CodeVerifiedStatus;
  lastVerifiedAt: string | null;
  successRate: number | null;
  successCount: number;
  totalVotes: number;
}

export type CodeVoteValue = "worked" | "did_not_work";

export interface CodeVote {
  id: string;
  couponId: string;
  userId: string;
  value: CodeVoteValue;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  thresholdType: "percent" | "absolute";
  thresholdValue: number;
  createdAt: string;
}

export interface DealFeedItem {
  id: string;
  source: "woot" | "dealnews" | "slickdeals";
  dedupeKey: string;
  title: string;
  url: string;
  storeSlug: StoreSlug | null;
  price: number | null;
  discountPercent: number | null;
  creatorAttributionUrl: string | null;
  postedAt: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  createdAt: string;
}

export interface FeedPreference {
  id: string;
  userId: string;
  category: string;
  enabled: boolean;
}

export type AlertChannel = "web_push" | "email";

export interface Alert {
  id: string;
  userId: string;
  wishlistItemId: string;
  priceId: string;
  channel: AlertChannel;
  sentAt: string | null;
  createdAt: string;
}

export type OnDemandResultType = "verdict" | "context";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface OnDemandCheck {
  id: string;
  userId: string;
  itemRef: string;
  suppliedPrice: number;
  storeSlug: StoreSlug;
  resultType: OnDemandResultType;
  confidence: ConfidenceLevel;
  sourcesUsed: string[];
  checkedAt: string;
}

/** Result of the deal-verdict percentile computation — see verdict.ts. */
export type VerdictStatus = "insufficient-data" | "verdict";

export interface VerdictResult {
  status: VerdictStatus;
  /** 0-100: share of the SKU's own logged price history this price beats or matches. */
  percentile?: number;
  daysOfHistory: number;
  daysUntilVerdict?: number;
  confidenceLabel: ConfidenceLevel;
  lastCheckedAt: string;
}
