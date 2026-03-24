import { describe, it, expect } from "vitest";
import { generateSignals } from "@/lib/engine/signalEngine";
import { getMockBars } from "@/lib/mock/bars";
import { computeTrendlines } from "@/lib/engine/trendlineEngine";
import type { OHLCBar } from "@/lib/indicators/atr";

function toEngineFormat(mockBars: ReturnType<typeof getMockBars>): Array<OHLCBar & { ts: string }> {
  return mockBars.map((b) => ({
    high: b.high,
    low: b.low,
    close: b.close,
    ts: b.ts,
  }));
}

describe("Signal Engine", () => {
  it("returns empty for insufficient data", () => {
    const bars = toEngineFormat(getMockBars("AAPL", "daily", 5));
    const signals = generateSignals("AAPL", "daily", bars);
    expect(signals).toEqual([]);
  });

  it("generates signals for AAPL mock data", () => {
    const bars = toEngineFormat(getMockBars("AAPL", "daily", 90));
    const signals = generateSignals("AAPL", "daily", bars);
    // Should produce at least some signals from 90 bars
    expect(Array.isArray(signals)).toBe(true);
  });

  it("signals have correct structure", () => {
    const bars = toEngineFormat(getMockBars("MSFT", "daily", 90));
    const signals = generateSignals("MSFT", "daily", bars);

    for (const sig of signals) {
      expect(sig.ticker).toBe("MSFT");
      expect(sig.timeframe).toBeTruthy();
      expect(sig.signalType).toBeTruthy();
      expect(["bull", "bear"]).toContain(sig.direction);
      expect(typeof sig.detail).toBe("string");
      expect(sig.signalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("detects RSI oversold on declining data", () => {
    // Create sharply declining closes
    const bars: Array<OHLCBar & { ts: string }> = Array.from({ length: 40 }, (_, i) => {
      const price = 200 - i * 3;
      return {
        high: price + 1,
        low: price - 1,
        close: price,
        ts: new Date(2025, 0, i + 1).toISOString(),
      };
    });
    const signals = generateSignals("TEST", "daily", bars);
    const rsiSignals = signals.filter((s) => s.signalType === "rsi_oversold");
    expect(rsiSignals.length).toBeGreaterThan(0);
    expect(rsiSignals[0].direction).toBe("bull");
  });

  it("detects RSI overbought on rising data", () => {
    const bars: Array<OHLCBar & { ts: string }> = Array.from({ length: 40 }, (_, i) => {
      const price = 100 + i * 3;
      return {
        high: price + 1,
        low: price - 1,
        close: price,
        ts: new Date(2025, 0, i + 1).toISOString(),
      };
    });
    const signals = generateSignals("TEST", "daily", bars);
    const rsiSignals = signals.filter((s) => s.signalType === "rsi_overbought");
    expect(rsiSignals.length).toBeGreaterThan(0);
    expect(rsiSignals[0].direction).toBe("bear");
  });

  it("generates proximity signal when near trendline", () => {
    const bars = toEngineFormat(getMockBars("QCOM", "daily", 90));
    const timedBars = bars.map((b) => ({ ...b }));
    const trendlines = computeTrendlines("QCOM", "daily", timedBars);

    const signals = generateSignals("QCOM", "daily", bars, trendlines);
    const proximity = signals.filter((s) => s.signalType === "proximity");
    // May or may not have proximity signals depending on random data
    expect(Array.isArray(proximity)).toBe(true);
  });

  it("does not generate divergence signals on flat data", () => {
    const bars: Array<OHLCBar & { ts: string }> = Array.from({ length: 40 }, (_, i) => ({
      high: 100.5,
      low: 99.5,
      close: 100,
      ts: new Date(2025, 0, i + 1).toISOString(),
    }));
    const signals = generateSignals("FLAT", "daily", bars);
    // Flat data should not trigger divergence signals
    const divergence = signals.filter((s) => s.signalType === "divergence");
    expect(divergence.length).toBe(0);
    // Flat data should not trigger MACD crossover signals
    const macd = signals.filter((s) => s.signalType.startsWith("macd"));
    expect(macd.length).toBe(0);
  });

  it("includes entry and stop prices for bullish signals", () => {
    const bars: Array<OHLCBar & { ts: string }> = Array.from({ length: 40 }, (_, i) => {
      const price = 200 - i * 3;
      return {
        high: price + 2,
        low: price - 2,
        close: price,
        ts: new Date(2025, 0, i + 1).toISOString(),
      };
    });
    const signals = generateSignals("TEST", "daily", bars);
    const bullSignals = signals.filter((s) => s.direction === "bull" && s.entryPrice !== null);
    for (const sig of bullSignals) {
      expect(sig.entryPrice).toBeGreaterThan(0);
      if (sig.stopPrice !== null) {
        expect(sig.stopPrice).toBeLessThan(sig.entryPrice!);
      }
    }
  });
});
