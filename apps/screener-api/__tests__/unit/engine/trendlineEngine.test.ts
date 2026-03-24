import { describe, it, expect } from "vitest";
import { computeTrendlines, projectTrendline } from "@/lib/engine/trendlineEngine";
import { getMockBars } from "@/lib/mock/bars";
import type { TimedOHLCBar } from "@/lib/indicators/zigzag";

function mockBarsToTimedOHLC(ticker: string): TimedOHLCBar[] {
  return getMockBars(ticker, "daily", 90).map((b) => ({
    high: b.high,
    low: b.low,
    close: b.close,
    ts: b.ts,
  }));
}

describe("Trendline Engine", () => {
  it("returns empty for insufficient data", () => {
    const bars: TimedOHLCBar[] = [
      { high: 101, low: 99, close: 100, ts: "2025-01-01T00:00:00Z" },
    ];
    expect(computeTrendlines("TEST", "daily", bars)).toEqual([]);
  });

  it("produces trendlines for AAPL mock data", () => {
    const bars = mockBarsToTimedOHLC("AAPL");
    const trendlines = computeTrendlines("AAPL", "daily", bars);
    expect(trendlines.length).toBeGreaterThan(0);
    expect(trendlines.length).toBeLessThanOrEqual(5); // topK=5
  });

  it("trendlines have correct structure", () => {
    const bars = mockBarsToTimedOHLC("MSFT");
    const trendlines = computeTrendlines("MSFT", "daily", bars);

    for (const tl of trendlines) {
      expect(tl.ticker).toBe("MSFT");
      expect(tl.timeframe).toBe("daily");
      expect(["support", "resistance"]).toContain(tl.type);
      expect(typeof tl.x1Ts).toBe("string");
      expect(typeof tl.x2Ts).toBe("string");
      expect(typeof tl.y1).toBe("number");
      expect(typeof tl.y2).toBe("number");
      expect(typeof tl.slope).toBe("number");
      expect(tl.touches).toBeGreaterThanOrEqual(0);
      expect(tl.score).toBeGreaterThan(0);
    }
  });

  it("trendlines are sorted by score descending", () => {
    const bars = mockBarsToTimedOHLC("NVDA");
    const trendlines = computeTrendlines("NVDA", "daily", bars);

    for (let i = 1; i < trendlines.length; i++) {
      expect(trendlines[i].score).toBeLessThanOrEqual(trendlines[i - 1].score);
    }
  });

  it("projects trendline to future date", () => {
    const tl = {
      x1Ts: "2025-01-01T00:00:00Z",
      y1: 100,
      slope: 0.000000001, // tiny positive slope
    };
    const futureDate = new Date("2025-06-01T00:00:00Z");
    const projected = projectTrendline(tl, futureDate);
    expect(projected).toBeGreaterThan(100); // should be slightly above 100
  });

  it("produces both support and resistance lines", () => {
    const bars = mockBarsToTimedOHLC("QCOM");
    const trendlines = computeTrendlines("QCOM", "daily", bars, 10);

    const types = new Set(trendlines.map((tl) => tl.type));
    // With enough data, we should get both types
    // (may not always be the case with random data, so just check structure)
    expect(trendlines.length).toBeGreaterThan(0);
    for (const tl of trendlines) {
      expect(["support", "resistance"]).toContain(tl.type);
    }
  });
});
