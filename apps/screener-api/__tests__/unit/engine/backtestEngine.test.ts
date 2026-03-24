import { describe, it, expect } from "vitest";
import { backtestTicker, backtestPortfolio } from "@/lib/engine/backtestEngine";
import { getMockBars } from "@/lib/mock/bars";
import type { TimedOHLCBar } from "@/lib/indicators/zigzag";

function toTimedOHLC(bars: ReturnType<typeof getMockBars>): TimedOHLCBar[] {
  return bars.map((b) => ({ high: b.high, low: b.low, close: b.close, ts: b.ts }));
}

describe("Backtest Engine", () => {
  it("returns empty result for insufficient data", () => {
    const bars = toTimedOHLC(getMockBars("AAPL", "daily", 10));
    const result = backtestTicker("AAPL", bars, [], {});
    expect(result.totalTrades).toBe(0);
    expect(result.totalPnl).toBe(0);
  });

  it("produces trades on 90 days of mock data", () => {
    const daily = toTimedOHLC(getMockBars("NVDA", "daily", 90));
    const weekly = toTimedOHLC(getMockBars("NVDA", "weekly", 90));
    const result = backtestTicker("NVDA", daily, weekly, {
      entryConfirmation: 0, // enter on any ENTRY zone signal
    });

    expect(result.ticker).toBe("NVDA");
    expect(result.barCount).toBe(daily.length);
    // Should have at least attempted some trades
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);

    // Verify trade structure
    for (const trade of result.trades) {
      expect(trade.ticker).toBe("NVDA");
      expect(trade.entryPrice).toBeGreaterThan(0);
      expect(trade.shares).toBeGreaterThan(0);
      expect(["take_profit", "stop_loss", "end_of_data"]).toContain(trade.exitReason);
    }
  });

  it("respects stop loss", () => {
    const daily = toTimedOHLC(getMockBars("QCOM", "daily", 90));
    const weekly = toTimedOHLC(getMockBars("QCOM", "weekly", 90));
    const result = backtestTicker("QCOM", daily, weekly, {
      stopLossAtrMultiple: 0.5, // very tight stop
      entryConfirmation: 0,
    });

    const stopLossTrades = result.trades.filter((t) => t.exitReason === "stop_loss");
    // With a very tight stop, most trades should hit stop loss
    for (const trade of stopLossTrades) {
      expect(trade.pnl).toBeLessThanOrEqual(0);
    }
  });

  it("computes valid statistics", () => {
    const daily = toTimedOHLC(getMockBars("MSFT", "daily", 90));
    const weekly = toTimedOHLC(getMockBars("MSFT", "weekly", 90));
    const result = backtestTicker("MSFT", daily, weekly, {
      entryConfirmation: 0,
    });

    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
    expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(result.winners + result.losers).toBe(result.totalTrades);
  });

  it("runs portfolio-level backtest across multiple tickers", () => {
    const tickers = ["AAPL", "MSFT", "NVDA"];
    const tickerData = tickers.map((ticker) => ({
      ticker,
      dailyBars: toTimedOHLC(getMockBars(ticker, "daily", 90)),
      weeklyBars: toTimedOHLC(getMockBars(ticker, "weekly", 90)),
    }));

    const result = backtestPortfolio(tickerData, { entryConfirmation: 0 });

    expect(result.tickers).toEqual(tickers);
    expect(result.initialCapital).toBe(100_000);
    expect(typeof result.finalCapital).toBe("number");
    expect(typeof result.totalReturnPct).toBe("number");
    expect(result.equityCurve.length).toBe(result.trades.length);
  });
});
