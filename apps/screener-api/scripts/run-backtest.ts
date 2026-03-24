import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { bars, watchedTickers } = await import("../lib/db/schema");
  const { eq, and, asc } = await import("drizzle-orm");
  const { backtestTicker, backtestPortfolio } = await import("../lib/engine/backtestEngine");

  if (!db) {
    console.error("Database not configured");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const tickerFilter = args.length > 0 ? args : null;

  // Get tickers
  let tickers = await db.select().from(watchedTickers);
  if (tickerFilter) {
    tickers = tickers.filter((t) => tickerFilter.includes(t.ticker));
  }

  // Limit to tickers that have enough data
  console.log(`\nBACKTEST — ${tickers.length} tickers`);
  console.log("═".repeat(70));

  const tickerData: Array<{
    ticker: string;
    dailyBars: Array<{ high: number; low: number; close: number; ts: string }>;
    weeklyBars: Array<{ high: number; low: number; close: number; ts: string }>;
    sector?: string;
  }> = [];

  for (const t of tickers) {
    const dailyBars = await db
      .select()
      .from(bars)
      .where(and(eq(bars.ticker, t.ticker), eq(bars.timeframe, "daily")))
      .orderBy(asc(bars.ts));

    const weeklyBars = await db
      .select()
      .from(bars)
      .where(and(eq(bars.ticker, t.ticker), eq(bars.timeframe, "weekly")))
      .orderBy(asc(bars.ts));

    if (dailyBars.length < 60) continue;

    tickerData.push({
      ticker: t.ticker,
      dailyBars: dailyBars.map((b) => ({
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
        ts: b.ts.toISOString(),
      })),
      weeklyBars: weeklyBars.map((b) => ({
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
        ts: b.ts.toISOString(),
      })),
      sector: t.sector ?? undefined,
    });
  }

  console.log(`Tickers with sufficient data: ${tickerData.length}`);
  console.log("");

  // ── Individual Ticker Results ────────────────────────────
  console.log("INDIVIDUAL TICKER RESULTS");
  console.log("─".repeat(70));
  console.log(
    `${"Ticker".padEnd(8)}${"Trades".padStart(7)}${"Win%".padStart(7)}${"Avg Win".padStart(9)}${"Avg Loss".padStart(9)}${"Total P&L".padStart(12)}${"Return%".padStart(9)}${"MaxDD%".padStart(8)}${"Avg Days".padStart(9)}`
  );

  const allResults = [];
  for (const td of tickerData) {
    const result = backtestTicker(td.ticker, td.dailyBars, td.weeklyBars, {
      entryConfirmation: 1,
      takeProfitPct: 0.10,
      stopLossAtrMultiple: 1.5,
    });
    allResults.push(result);

    if (result.totalTrades > 0) {
      console.log(
        `${result.ticker.padEnd(8)}${String(result.totalTrades).padStart(7)}${(result.winRate + "%").padStart(7)}${(result.avgWinPct + "%").padStart(9)}${(result.avgLossPct + "%").padStart(9)}${"$" + result.totalPnl.toFixed(0).padStart(11)}${(result.totalReturnPct + "%").padStart(9)}${(result.maxDrawdownPct + "%").padStart(8)}${String(result.avgHoldingDays).padStart(9)}`
      );
    }
  }

  // ── Portfolio-Level Results ──────────────────────────────
  console.log("");
  console.log("PORTFOLIO BACKTEST ($100K starting capital)");
  console.log("═".repeat(70));

  const portfolio = backtestPortfolio(tickerData, {
    initialCapital: 100_000,
    maxPositionPct: 0.03,
    maxPositions: 10,
    entryConfirmation: 1,
    takeProfitPct: 0.10,
    stopLossAtrMultiple: 1.5,
  });

  console.log(`Period:          ${portfolio.startDate} → ${portfolio.endDate}`);
  console.log(`Initial Capital: $${portfolio.initialCapital.toLocaleString()}`);
  console.log(`Final Capital:   $${portfolio.finalCapital.toLocaleString()}`);
  console.log(`Total Return:    ${portfolio.totalReturnPct}%`);
  console.log(`Total Trades:    ${portfolio.totalTrades}`);
  console.log(`Win Rate:        ${portfolio.winRate}%`);
  console.log(`Profit Factor:   ${portfolio.profitFactor}`);
  console.log(`Max Drawdown:    ${portfolio.maxDrawdownPct}%`);
  console.log(`Sharpe Ratio:    ${portfolio.sharpeRatio}`);

  // Verdict
  console.log("");
  console.log("VERDICT");
  console.log("─".repeat(70));
  if (portfolio.totalReturnPct > 0 && portfolio.winRate > 50) {
    console.log("✅ System is profitable with >50% win rate. Ready for paper trading.");
  } else if (portfolio.totalReturnPct > 0) {
    console.log("🟡 System is profitable but win rate is below 50%. Winners are bigger than losers.");
  } else {
    console.log("🔴 System lost money in backtest. DO NOT proceed to paper/live trading.");
    console.log("   Tune parameters before retrying.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Backtest failed:", err);
  process.exit(1);
});
