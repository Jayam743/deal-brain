import type { DealFeedItem } from "@coupon-app/shared";

export const SOURCE_LABEL: Record<DealFeedItem["source"], string> = {
  woot: "Woot",
  dealnews: "DealNews",
  slickdeals: "Slickdeals",
};
