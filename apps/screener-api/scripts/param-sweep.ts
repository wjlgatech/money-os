import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { bars } = await import("../lib/db/schema");
  const { eq, and, asc } = await import("drizzle-orm");
  const { backtestPortfolio } = await import("../lib/engine/backtestEngine");
  const { detectRegime } = await import("../lib/indicators/regime");

  if (!db) { console.error("No DB"); process.exit(1); }

  // Load SPY benchmark data for regime detection
  const spyBars = await db.select().from(bars)
    .where(and(eq(bars.ticker, "SPY"), eq(bars.timeframe, "daily")))
    .orderBy(asc(bars.ts));
  const spyCloses = spyBars.map((b) => Number(b.close));
  console.log(`SPY benchmark: ${spyCloses.length} daily bars`);

  // Show current regime
  const regime = detectRegime(spyCloses);
  console.log(`Current regime: ${regime.regime.toUpperCase()} (confidence: ${regime.confidence})`);
  console.log(`  Price: $${regime.details.currentPrice} | SMA50: $${regime.details.sma50} | SMA200: $${regime.details.sma200}`);
  console.log(`  Price vs 200: ${regime.details.priceVs200} | 50 vs 200: ${regime.details.sma50Vs200} | Slope: ${regime.details.sma200Slope}`);

  const tickers = ["AAPL", "MSFT", "NVDA", "QCOM", "UNH", "AMZN", "GOOGL", "META", "JPM", "V"];
  const tickerData: Array<{
    ticker: string;
    dailyBars: Array<{ high: number; low: number; close: number; ts: string }>;
    weeklyBars: Array<{ high: number; low: number; close: number; ts: string }>;
  }> = [];

  for (const ticker of tickers) {
    const daily = await db.select().from(bars).where(and(eq(bars.ticker, ticker), eq(bars.timeframe, "daily"))).orderBy(asc(bars.ts));
    const weekly = await db.select().from(bars).where(and(eq(bars.ticker, ticker), eq(bars.timeframe, "weekly"))).orderBy(asc(bars.ts));
    if (daily.length < 60) continue;
    tickerData.push({
      ticker,
      dailyBars: daily.map((b) => ({ high: Number(b.high), low: Number(b.low), close: Number(b.close), ts: b.ts.toISOString() })),
      weeklyBars: weekly.map((b) => ({ high: Number(b.high), low: Number(b.low), close: Number(b.close), ts: b.ts.toISOString() })),
    });
  }

  console.log(`\nPARAMETER SWEEP — ${tickerData.length} tickers`);
  console.log("═".repeat(100));
  console.log(
    `${"Config".padEnd(50)}${"Trades".padStart(7)}${"Win%".padStart(7)}${"Return%".padStart(9)}${"MaxDD%".padStart(8)}${"PF".padStart(6)}${"Sharpe".padStart(8)}`
  );

  const configs = [
    // Baseline: no new filters
    { name: "BASELINE: 1.5ATR, 1conf, 10%TP",                stopLossAtrMultiple: 1.5, entryConfirmation: 1, takeProfitPct: 0.10, useRegimeFilter: false, useStockTrendFilter: false, useMultiTfScoring: false },
    // Stock trend filter only (only buy stocks above their 50 SMA)
    { name: "TREND50: 1.5ATR, 1conf, 10%TP",                 stopLossAtrMultiple: 1.5, entryConfirmation: 1, takeProfitPct: 0.10, useRegimeFilter: false, useStockTrendFilter: true, useMultiTfScoring: false },
    { name: "TREND50: 2.0ATR, 1conf, 10%TP",                 stopLossAtrMultiple: 2.0, entryConfirmation: 1, takeProfitPct: 0.10, useRegimeFilter: false, useStockTrendFilter: true, useMultiTfScoring: false },
    { name: "TREND50: 2.0ATR, 0conf, 8%TP",                  stopLossAtrMultiple: 2.0, entryConfirmation: 0, takeProfitPct: 0.08, useRegimeFilter: false, useStockTrendFilter: true, useMultiTfScoring: false },
    // Multi-timeframe scoring (boost when weekly+daily align)
    { name: "MULTI-TF: 1.5ATR, 1conf, 10%TP",               stopLossAtrMultiple: 1.5, entryConfirmation: 1, takeProfitPct: 0.10, useRegimeFilter: false, useStockTrendFilter: false, useMultiTfScoring: true },
    // Combined: trend filter + multi-TF + regime
    { name: "ALL: trend+multiTF, 1.5ATR, 1conf, 10%TP",      stopLossAtrMultiple: 1.5, entryConfirmation: 1, takeProfitPct: 0.10, useRegimeFilter: true, useStockTrendFilter: true, useMultiTfScoring: true },
    { name: "ALL: trend+multiTF, 2.0ATR, 1conf, 10%TP",      stopLossAtrMultiple: 2.0, entryConfirmation: 1, takeProfitPct: 0.10, useRegimeFilter: true, useStockTrendFilter: true, useMultiTfScoring: true },
    { name: "ALL: trend+multiTF, 2.0ATR, 0conf, 8%TP",       stopLossAtrMultiple: 2.0, entryConfirmation: 0, takeProfitPct: 0.08, useRegimeFilter: true, useStockTrendFilter: true, useMultiTfScoring: true },
    { name: "ALL: trend+multiTF, 1.5ATR, 2conf, 15%TP",      stopLossAtrMultiple: 1.5, entryConfirmation: 2, takeProfitPct: 0.15, useRegimeFilter: true, useStockTrendFilter: true, useMultiTfScoring: true },
  ];

  for (const cfg of configs) {
    const result = backtestPortfolio(tickerData, {
      initialCapital: 100_000,
      maxPositionPct: 0.03,
      ...cfg,
    }, spyCloses);
    console.log(
      `${cfg.name.padEnd(50)}${String(result.totalTrades).padStart(7)}${(result.winRate + "%").padStart(7)}${(result.totalReturnPct + "%").padStart(9)}${(result.maxDrawdownPct + "%").padStart(8)}${String(result.profitFactor).padStart(6)}${String(result.sharpeRatio).padStart(8)}`
    );
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
