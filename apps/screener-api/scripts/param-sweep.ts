import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { bars } = await import("../lib/db/schema");
  const { eq, and, asc } = await import("drizzle-orm");
  const { backtestPortfolio } = await import("../lib/engine/backtestEngine");

  if (!db) { console.error("No DB"); process.exit(1); }

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
  console.log("═".repeat(95));
  console.log(
    `${"Config".padEnd(45)}${"Trades".padStart(7)}${"Win%".padStart(7)}${"Return%".padStart(9)}${"MaxDD%".padStart(8)}${"PF".padStart(6)}${"Sharpe".padStart(8)}`
  );

  const configs = [
    { name: "Baseline: 1.5ATR stop, 1 confirm, 10%TP", stopLossAtrMultiple: 1.5, entryConfirmation: 1, takeProfitPct: 0.10 },
    { name: "Wider stop: 2.5ATR, 1 confirm, 10%TP",    stopLossAtrMultiple: 2.5, entryConfirmation: 1, takeProfitPct: 0.10 },
    { name: "Wider stop: 2.5ATR, 2 confirms, 10%TP",   stopLossAtrMultiple: 2.5, entryConfirmation: 2, takeProfitPct: 0.10 },
    { name: "Wide: 3.0ATR, 2 confirms, 15%TP",         stopLossAtrMultiple: 3.0, entryConfirmation: 2, takeProfitPct: 0.15 },
    { name: "Loose: 3.0ATR, 0 confirms, 8%TP",         stopLossAtrMultiple: 3.0, entryConfirmation: 0, takeProfitPct: 0.08 },
    { name: "Scalp: 2.0ATR, 0 confirms, 5%TP",         stopLossAtrMultiple: 2.0, entryConfirmation: 0, takeProfitPct: 0.05 },
    { name: "Swing: 3.0ATR, 1 confirm, 20%TP",         stopLossAtrMultiple: 3.0, entryConfirmation: 1, takeProfitPct: 0.20 },
  ];

  for (const cfg of configs) {
    const result = backtestPortfolio(tickerData, {
      initialCapital: 100_000,
      maxPositionPct: 0.03,
      ...cfg,
    });
    console.log(
      `${cfg.name.padEnd(45)}${String(result.totalTrades).padStart(7)}${(result.winRate + "%").padStart(7)}${(result.totalReturnPct + "%").padStart(9)}${(result.maxDrawdownPct + "%").padStart(8)}${String(result.profitFactor).padStart(6)}${String(result.sharpeRatio).padStart(8)}`
    );
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
