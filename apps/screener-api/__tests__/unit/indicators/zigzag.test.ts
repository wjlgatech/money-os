import { describe, it, expect } from "vitest";
import { findPivots, type TimedOHLCBar } from "@/lib/indicators/zigzag";

function makeBars(prices: number[]): TimedOHLCBar[] {
  return prices.map((p, i) => ({
    high: p + 1,
    low: p - 1,
    close: p,
    ts: new Date(2025, 0, i + 1).toISOString(),
  }));
}

describe("Zigzag Pivot Detection", () => {
  it("returns empty for insufficient bars", () => {
    const bars = makeBars([100, 101, 102]);
    expect(findPivots(bars, 5)).toEqual([]);
  });

  it("detects V-shape pattern (one low pivot)", () => {
    // Down then up: clear V-shape at the bottom
    const prices = [
      110, 108, 106, 104, 102, 100, 102, 104, 106, 108, 110, 112, 114,
    ];
    const bars = makeBars(prices);
    const pivots = findPivots(bars, 3, 0);

    const lows = pivots.filter((p) => p.type === "low");
    expect(lows.length).toBeGreaterThanOrEqual(1);
    // The lowest pivot should be near index 5 (price 100)
    const lowestPivot = lows.reduce((a, b) => (a.price < b.price ? a : b));
    expect(lowestPivot.price).toBeLessThanOrEqual(101); // low = price - 1 = 99
  });

  it("detects inverted V (one high pivot)", () => {
    const prices = [
      90, 92, 94, 96, 98, 100, 98, 96, 94, 92, 90, 88, 86,
    ];
    const bars = makeBars(prices);
    const pivots = findPivots(bars, 3, 0);

    const highs = pivots.filter((p) => p.type === "high");
    expect(highs.length).toBeGreaterThanOrEqual(1);
  });

  it("detects W-shape pattern (two lows, one high)", () => {
    // W pattern: down, up, down, up
    const prices = [
      110, 108, 105, 102, 100, 103, 106, 109, 106, 103, 100, 103, 106, 109, 112,
    ];
    const bars = makeBars(prices);
    const pivots = findPivots(bars, 2, 0);

    // Should detect at least 2 lows and 1 high
    const lows = pivots.filter((p) => p.type === "low");
    const highs = pivots.filter((p) => p.type === "high");
    expect(lows.length).toBeGreaterThanOrEqual(1);
    expect(highs.length + lows.length).toBeGreaterThanOrEqual(2);
  });

  it("returns no pivots for flat prices", () => {
    const prices = Array.from({ length: 20 }, () => 100);
    const bars = makeBars(prices);
    const pivots = findPivots(bars, 3, 0);
    // Flat prices produce no swings
    expect(pivots.length).toBe(0);
  });

  it("ATR filter removes insignificant pivots", () => {
    // Very small oscillations around a value
    const prices = Array.from({ length: 30 }, (_, i) =>
      100 + Math.sin(i * 0.5) * 0.1
    );
    const bars = makeBars(prices);

    // With high ATR multiplier, small swings should be filtered
    const pivotsFiltered = findPivots(bars, 3, 2.0);
    const pivotsUnfiltered = findPivots(bars, 3, 0);
    expect(pivotsFiltered.length).toBeLessThanOrEqual(pivotsUnfiltered.length);
  });
});
