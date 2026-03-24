import { describe, it, expect } from "vitest";
import { scanTicker, type ScanResult } from "@/lib/engine/scannerEngine";
import type { TrendlineCandidate } from "@/lib/engine/trendlineEngine";

function makeTrendline(
  overrides: Partial<TrendlineCandidate> = {}
): TrendlineCandidate {
  return {
    ticker: "TEST",
    timeframe: "daily",
    type: "support",
    x1Ts: "2025-01-01T00:00:00Z",
    x2Ts: "2025-03-01T00:00:00Z",
    y1: 100,
    y2: 100, // flat support at 100
    slope: 0,
    touches: 3,
    score: 5,
    ...overrides,
  };
}

const scanDate = new Date("2025-03-15T00:00:00Z");

describe("Scanner Engine", () => {
  it("returns empty when no trendlines", () => {
    const results = scanTicker("TEST", "stock", 100, 5, 20, []);
    expect(results).toEqual([]);
  });

  it("returns empty when ATR is 0", () => {
    const tl = makeTrendline();
    const results = scanTicker("TEST", "stock", 100, 0, 20, [tl]);
    expect(results).toEqual([]);
  });

  it("classifies ENTRY zone (distance <= 1.0 ATR)", () => {
    // Support at 100, price at 102, ATR = 5, VIX = 20 (volFactor = 1)
    // Distance = 2, adjustedATR = 5, distanceATR = 0.4 → ENTRY
    const tl = makeTrendline({ y1: 100, y2: 100, slope: 0 });
    const results = scanTicker("TEST", "stock", 102, 5, 20, [tl], null, scanDate);

    expect(results.length).toBe(1);
    expect(results[0].zone).toBe("ENTRY");
    expect(results[0].distanceAtr).toBeLessThanOrEqual(1.0);
  });

  it("classifies ALERT zone (1.0 < distance <= 1.5 ATR)", () => {
    // Support at 100, price at 106, ATR = 5, VIX = 20
    // Distance = 6, adjustedATR = 5, distanceATR = 1.2 → ALERT
    const tl = makeTrendline({ y1: 100, y2: 100, slope: 0 });
    const results = scanTicker("TEST", "stock", 106, 5, 20, [tl], null, scanDate);

    expect(results.length).toBe(1);
    expect(results[0].zone).toBe("ALERT");
  });

  it("excludes stocks outside both zones", () => {
    // Support at 100, price at 115, ATR = 5, VIX = 20
    // Distance = 15, adjustedATR = 5, distanceATR = 3.0 → no zone
    const tl = makeTrendline({ y1: 100, y2: 100, slope: 0 });
    const results = scanTicker("TEST", "stock", 115, 5, 20, [tl], null, scanDate);

    expect(results.length).toBe(0);
  });

  it("VIX adjustment widens zones in high-vol environment", () => {
    // Support at 100, price at 108, ATR = 5
    // VIX = 40 → volFactor = 2, adjustedATR = 10, distanceATR = 0.8 → ENTRY
    // VIX = 20 → volFactor = 1, adjustedATR = 5, distanceATR = 1.6 → no zone
    const tl = makeTrendline({ y1: 100, y2: 100, slope: 0 });

    const highVol = scanTicker("TEST", "stock", 108, 5, 40, [tl], null, scanDate);
    const normalVol = scanTicker("TEST", "stock", 108, 5, 20, [tl], null, scanDate);

    expect(highVol.length).toBe(1);
    expect(highVol[0].zone).toBe("ENTRY");
    expect(normalVol.length).toBe(0); // 1.6 ATR > 1.5 threshold
  });

  it("detects intersection when weekly and daily lines converge", () => {
    const weeklyTl = makeTrendline({
      timeframe: "weekly",
      y1: 100,
      y2: 100,
      slope: 0,
    });
    const dailyTl = makeTrendline({
      timeframe: "daily",
      y1: 101,
      y2: 101,
      slope: 0,
    });

    // Price near both: 102, ATR = 5, VIX = 20
    // Weekly and daily within 0.5 * 5 = 2.5 of each other (100 vs 101 = 1) → IX
    const results = scanTicker(
      "TEST", "stock", 102, 5, 20,
      [weeklyTl, dailyTl], null, scanDate
    );

    const ixResults = results.filter((r) => r.signalType === "IX");
    expect(ixResults.length).toBeGreaterThan(0);
  });

  it("classifies support vs resistance direction", () => {
    const supportTl = makeTrendline({ type: "support", y1: 95, y2: 95, slope: 0 });
    const resistanceTl = makeTrendline({ type: "resistance", y1: 105, y2: 105, slope: 0 });

    const results = scanTicker(
      "TEST", "stock", 100, 5, 20,
      [supportTl, resistanceTl], null, scanDate
    );

    const support = results.find((r) => r.direction === "support");
    const resistance = results.find((r) => r.direction === "resistance");
    expect(support).toBeDefined();
    expect(resistance).toBeDefined();
  });
});
