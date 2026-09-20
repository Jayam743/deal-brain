import { describe, expect, it } from "vitest";
import { computeVerdict, percentileRank } from "./verdict";

describe("percentileRank", () => {
  it("ranks the current price against its own history", () => {
    // Cheaper than 3 of 4 historical prices -> 75th percentile.
    expect(percentileRank(80, [100, 90, 85, 70])).toBe(75);
  });

  it("returns 0 for an empty history", () => {
    expect(percentileRank(50, [])).toBe(0);
  });
});

describe("computeVerdict", () => {
  it("returns an honest insufficient-data state before 30 days of history", () => {
    const now = new Date("2026-09-14T00:00:00Z");
    const result = computeVerdict(100, [{ price: 110, capturedAt: "2026-09-10T00:00:00Z" }], now);

    expect(result.status).toBe("insufficient-data");
    expect(result.daysOfHistory).toBe(4);
    expect(result.daysUntilVerdict).toBe(26);
    expect(result.confidenceLabel).toBe("low");
  });

  it("returns a percentile verdict once 30+ days of history exist", () => {
    const now = new Date("2026-09-14T00:00:00Z");
    const observations = [
      { price: 120, capturedAt: "2026-06-01T00:00:00Z" },
      { price: 110, capturedAt: "2026-07-01T00:00:00Z" },
      { price: 100, capturedAt: "2026-08-01T00:00:00Z" },
      { price: 90, capturedAt: "2026-08-20T00:00:00Z" },
    ];

    const result = computeVerdict(95, observations, now);

    expect(result.status).toBe("verdict");
    expect(result.percentile).toBe(75);
    expect(result.confidenceLabel).toBe("high");
  });
});
