import { describe, it, expect } from "vitest";
import { getMockBars, getMockScannerResults, getMockSignals } from "@/lib/mock/bars";
import { getMockVixData, getMockLatestVix } from "@/lib/mock/vix";
import { MOCK_TICKERS } from "@/lib/mock/tickers";
import { computeTrendlines, projectTrendline } from "@/lib/engine/trendlineEngine";
import { scanTicker } from "@/lib/engine/scannerEngine";
import { generateSignals } from "@/lib/engine/signalEngine";
import { calcATR, latestATR } from "@/lib/indicators/atr";
import type { TimedOHLCBar } from "@/lib/indicators/zigzag";

describe("Full Pipeline — Mock Data End-to-End", () => {
  it("runs complete pipeline: bars → trendlines → scanner → signals for all mock tickers", () => {
    const vixData = getMockLatestVix();
    const vix = vixData.close;

    const allScanResults: Array<ReturnType<typeof scanTicker>[number]> = [];
    const allSignals: Array<ReturnType<typeof generateSignals>[number]> = [];

    for (const { ticker, asset, sector } of MOCK_TICKERS) {
      // Step 1: Get bars
      const dailyBars = getMockBars(ticker, "daily", 90);
      const weeklyBars = getMockBars(ticker, "weekly", 90);

      expect(dailyBars.length).toBeGreaterThan(30);
      expect(weeklyBars.length).toBeGreaterThan(10);

      // Step 2: Compute trendlines
      const toTimedOHLC = (b: ReturnType<typeof getMockBars>[0]): TimedOHLCBar => ({
        high: b.high, low: b.low, close: b.close, ts: b.ts,
      });

      const dailyTrendlines = computeTrendlines(ticker, "daily", dailyBars.map(toTimedOHLC));
      const weeklyTrendlines = computeTrendlines(ticker, "weekly", weeklyBars.map(toTimedOHLC));
      const allTrendlines = [...dailyTrendlines, ...weeklyTrendlines];

      // At least some trendlines should be found
      expect(allTrendlines.length).toBeGreaterThan(0);

      // Trendlines should have valid structure
      for (const tl of allTrendlines) {
        expect(tl.ticker).toBe(ticker);
        expect(["daily", "weekly"]).toContain(tl.timeframe);
        expect(["support", "resistance"]).toContain(tl.type);
        expect(tl.score).toBeGreaterThan(0);
      }

      // Step 3: Run scanner
      const atr = latestATR(dailyBars.map(toTimedOHLC)) ?? 1;
      const currentPrice = dailyBars[dailyBars.length - 1].close;

      const scanResults = scanTicker(
        ticker, asset, currentPrice, atr, vix,
        allTrendlines, sector
      );

      // Scan results may or may not exist depending on proximity
      for (const sr of scanResults) {
        expect(sr.ticker).toBe(ticker);
        expect(["ENTRY", "ALERT"]).toContain(sr.zone);
        expect(["TL", "IX"]).toContain(sr.signalType);
        expect(sr.distanceAtr).toBeGreaterThanOrEqual(0);
        expect(sr.distanceAtr).toBeLessThanOrEqual(1.5);
      }
      allScanResults.push(...scanResults);

      // Step 4: Generate signals
      const engineBars = dailyBars.map((b) => ({
        high: b.high, low: b.low, close: b.close, ts: b.ts,
      }));
      const signals = generateSignals(ticker, "daily", engineBars, allTrendlines);

      for (const sig of signals) {
        expect(sig.ticker).toBe(ticker);
        expect(["bull", "bear"]).toContain(sig.direction);
        expect(sig.signalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      allSignals.push(...signals);
    }

    // Verify pipeline produced results across the universe
    console.log(`Pipeline complete:
  Tickers processed: ${MOCK_TICKERS.length}
  Total scan results: ${allScanResults.length}
  Total signals: ${allSignals.length}
  Entry zone: ${allScanResults.filter((r) => r.zone === "ENTRY").length}
  Alert zone: ${allScanResults.filter((r) => r.zone === "ALERT").length}
  Bullish signals: ${allSignals.filter((s) => s.direction === "bull").length}
  Bearish signals: ${allSignals.filter((s) => s.direction === "bear").length}`);

    // Should produce at least some signals across 5 tickers
    expect(allSignals.length).toBeGreaterThan(0);
  });

  it("mock API data is consistent and complete", () => {
    // Scanner mock results
    const scanResults = getMockScannerResults();
    expect(scanResults.length).toBeGreaterThan(0);
    for (const r of scanResults) {
      expect(r.ticker).toBeTruthy();
      expect(r.price).toBeGreaterThan(0);
      expect(["ENTRY", "ALERT"]).toContain(r.zone);
    }

    // Signal mock results
    const signals = getMockSignals();
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) {
      expect(s.ticker).toBeTruthy();
      expect(s.signalType).toBeTruthy();
      expect(["bull", "bear"]).toContain(s.direction);
    }

    // VIX mock data
    const vixData = getMockVixData();
    expect(vixData.length).toBeGreaterThan(30);
    for (const v of vixData) {
      expect(v.close).toBeGreaterThan(5);
      expect(v.close).toBeLessThan(80);
    }

    // Mock bars are deterministic
    const bars1 = getMockBars("AAPL", "daily", 30);
    const bars2 = getMockBars("AAPL", "daily", 30);
    expect(bars1).toEqual(bars2);
  });

  it("trendline projection produces reasonable prices", () => {
    const dailyBars = getMockBars("NVDA", "daily", 90);
    const toTimedOHLC = (b: ReturnType<typeof getMockBars>[0]): TimedOHLCBar => ({
      high: b.high, low: b.low, close: b.close, ts: b.ts,
    });

    const trendlines = computeTrendlines("NVDA", "daily", dailyBars.map(toTimedOHLC));
    const currentPrice = dailyBars[dailyBars.length - 1].close;

    for (const tl of trendlines) {
      const projected = projectTrendline(tl);
      // Projected price should be within reasonable range of current price
      // (not 10x or 0.1x — that would indicate a slope calculation error)
      expect(projected).toBeGreaterThan(currentPrice * 0.3);
      expect(projected).toBeLessThan(currentPrice * 3);
    }
  });
});
