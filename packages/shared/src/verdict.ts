import type { ConfidenceLevel, VerdictResult } from "./types";

export interface PriceObservation {
  price: number;
  capturedAt: string;
}

/** Cold-start honesty floor (R-08): no verdict before ~30 days of own history. */
export const MIN_DAYS_FOR_VERDICT = 30;
/** Confidence upgrades from "medium" to "high" once history spans ~3 months. */
export const HIGH_CONFIDENCE_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The percentile rank of `currentPrice` against a SKU's own logged price
 * history (R-06): the share of historical observations this price beats or
 * matches. 100 = at or below every price ever logged (as cheap as it's been);
 * 0 = at or above every price ever logged (as expensive as it's been).
 */
export function percentileRank(currentPrice: number, history: number[]): number {
  if (history.length === 0) return 0;
  const atOrBelow = history.filter((price) => currentPrice <= price).length;
  return Math.round((atOrBelow / history.length) * 100);
}

/**
 * Computes an honest deal verdict for a SKU: an "insufficient data" state
 * while history is thin (R-08), otherwise a percentile-based verdict (R-06)
 * with a confidence label that only strengthens as history accrues.
 */
export function computeVerdict(
  currentPrice: number,
  observations: PriceObservation[],
  now: Date = new Date(),
): VerdictResult {
  if (observations.length === 0) {
    return {
      status: "insufficient-data",
      daysOfHistory: 0,
      daysUntilVerdict: MIN_DAYS_FOR_VERDICT,
      confidenceLabel: "low",
      lastCheckedAt: now.toISOString(),
    };
  }

  const capturedTimes = observations.map((o) => new Date(o.capturedAt).getTime());
  const earliest = Math.min(...capturedTimes);
  const latest = Math.max(...capturedTimes);
  const daysOfHistory = Math.floor((now.getTime() - earliest) / MS_PER_DAY);
  const lastCheckedAt = new Date(latest).toISOString();

  if (daysOfHistory < MIN_DAYS_FOR_VERDICT) {
    return {
      status: "insufficient-data",
      daysOfHistory,
      daysUntilVerdict: MIN_DAYS_FOR_VERDICT - daysOfHistory,
      confidenceLabel: "low",
      lastCheckedAt,
    };
  }

  const percentile = percentileRank(
    currentPrice,
    observations.map((o) => o.price),
  );
  const confidenceLabel: ConfidenceLevel =
    daysOfHistory >= HIGH_CONFIDENCE_DAYS ? "high" : "medium";

  return {
    status: "verdict",
    percentile,
    daysOfHistory,
    confidenceLabel,
    lastCheckedAt,
  };
}
