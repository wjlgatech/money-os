/**
 * Daily Auto-Trader
 *
 * Reads today's scanner + signal results from the database,
 * generates trade proposals, executes approved ones in paper trading.
 *
 * Run after the daily pipeline completes:
 *   npx tsx scripts/daily-auto-trader.ts [--execute]
 *
 * Without --execute: shows proposals only (dry run)
 * With --execute: executes proposals into paper portfolio
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { scanResults, tradingSignals, bars, watchedTickers } = await import("../lib/db/schema");
  const { eq, and, desc } = await import("drizzle-orm");
  const { latestATR } = await import("../lib/indicators/atr");
  const { PaperTrader } = await import("../lib/engine/paperTrader");
  const { readFile, writeFile, mkdir } = await import("fs/promises");
  const { existsSync } = await import("fs");
  const path = await import("path");

  if (!db) { console.error("No database"); process.exit(1); }

  const executeMode = process.argv.includes("--execute");

  // Load or create paper portfolio
  const portfolioPath = path.join(process.cwd(), "data", "paper-portfolio.json");
  let trader: InstanceType<typeof PaperTrader>;
  try {
    const json = await readFile(portfolioPath, "utf8");
    trader = PaperTrader.fromJSON(json);
  } catch {
    trader = new PaperTrader();
  }

  const portfolio = trader.getPortfolio();
  const totalValue = portfolio.cash + portfolio.positions.reduce(
    (s, p) => s + p.currentPrice * p.shares, 0
  );

  console.log("\n📊 DAILY AUTO-TRADER");
  console.log("═".repeat(70));
  console.log(`Mode: ${executeMode ? "🔴 LIVE EXECUTION" : "👀 DRY RUN (add --execute to trade)"}`);
  console.log(`Portfolio: $${totalValue.toFixed(2)} | Cash: $${portfolio.cash.toFixed(2)} | Positions: ${portfolio.positions.length}`);
  console.log("");

  // ── Step 1: Check exits on existing positions ────────────
  if (portfolio.positions.length > 0) {
    console.log("CHECKING EXITS on existing positions...");
    const currentPrices: Record<string, number> = {};

    for (const pos of portfolio.positions) {
      const latestBar = await db.select().from(bars)
        .where(and(eq(bars.ticker, pos.ticker), eq(bars.timeframe, "daily")))
        .orderBy(desc(bars.ts)).limit(1);
      if (latestBar.length > 0) {
        currentPrices[pos.ticker] = Number(latestBar[0].close);
      }
    }

    const exitTrades = trader.checkExits(currentPrices);
    if (exitTrades.length > 0) {
      for (const t of exitTrades) {
        console.log(`  🔴 SOLD ${t.ticker} | ${t.shares} shares @ $${t.price} | ${t.reason} | P&L: $${t.pnl}`);
      }
    } else {
      console.log("  No exits triggered.");
    }
    console.log("");
  }

  // ── Step 2: Find new entry opportunities ─────────────────
  console.log("SCANNING for new entries...");

  const entryResults = await db.select().from(scanResults)
    .where(eq(scanResults.zone, "ENTRY"));

  if (entryResults.length === 0) {
    console.log("  No ENTRY zone signals today.");
    console.log("\nDone.");
    if (executeMode) await save(trader, portfolioPath);
    process.exit(0);
  }

  // Get signals for ENTRY zone tickers
  const today = new Date().toISOString().slice(0, 10);
  const proposals = [];

  for (const scan of entryResults) {
    // Skip if we already have a position
    if (portfolio.positions.find((p) => p.ticker === scan.ticker)) {
      continue;
    }

    // Get confirming signals
    const signals = await db.select().from(tradingSignals)
      .where(and(
        eq(tradingSignals.ticker, scan.ticker),
        eq(tradingSignals.signalDate, today)
      ));

    const bullSignals = signals.filter((s) => s.direction === "bull");

    // Get ATR for position sizing
    const recentBars = await db.select().from(bars)
      .where(and(eq(bars.ticker, scan.ticker), eq(bars.timeframe, "daily")))
      .orderBy(desc(bars.ts)).limit(20);

    const atr = latestATR(recentBars.reverse().map((b) => ({
      high: Number(b.high), low: Number(b.low), close: Number(b.close),
    })));

    if (!atr) continue;

    const price = Number(scan.price);
    const stopLoss = Number((price - 2.0 * atr).toFixed(2));
    const takeProfit = Number((price * 1.08).toFixed(2));

    // Position size: 3% of portfolio, max risk 1%
    const maxPosition = totalValue * 0.03;
    const riskPerShare = price - stopLoss;
    const maxSharesByRisk = Math.floor((totalValue * 0.01) / riskPerShare);
    const maxSharesBySize = Math.floor(maxPosition / price);
    const shares = Math.min(maxSharesByRisk, maxSharesBySize);

    if (shares <= 0) continue;

    const proposal = trader.createProposal(
      scan.ticker, "buy", shares, price,
      `ENTRY zone: ${scan.direction} ${scan.timeframe} trendline, ` +
      `${bullSignals.length} confirming signal(s)`,
      bullSignals.map((s) => s.signalType),
      stopLoss, takeProfit
    );

    proposals.push(proposal);
  }

  // Deduplicate: keep best proposal per ticker (most confirming signals)
  const bestByTicker = new Map<string, typeof proposals[0]>();
  for (const p of proposals) {
    const existing = bestByTicker.get(p.ticker);
    if (!existing || p.signals.length > existing.signals.length) {
      bestByTicker.set(p.ticker, p);
    }
  }
  proposals.length = 0;
  proposals.push(...bestByTicker.values());

  // Limit to top 5 by confidence + signal count
  proposals.sort((a, b) => {
    const confOrder = { high: 3, medium: 2, low: 1 };
    return (confOrder[b.confidence] + b.signals.length) - (confOrder[a.confidence] + a.signals.length);
  });
  proposals.splice(5);

  if (proposals.length === 0) {
    console.log("  ENTRY zone stocks found but none passed position sizing filters.");
    console.log("\nDone.");
    if (executeMode) await save(trader, portfolioPath);
    process.exit(0);
  }

  // ── Step 3: Display Proposals ────────────────────────────
  console.log(`\n📋 TRADE PROPOSALS (${proposals.length})`);
  console.log("─".repeat(70));

  for (const p of proposals) {
    const conf = p.confidence === "high" ? "🟢" : p.confidence === "medium" ? "🟡" : "⚪";
    console.log(
      `${conf} ${p.side.toUpperCase()} ${p.shares} ${p.ticker} @ ~$${p.estimatedPrice.toFixed(2)}`
    );
    console.log(`   Stop: $${p.stopLoss?.toFixed(2)} | Target: $${p.takeProfit?.toFixed(2)} | Risk: $${p.riskAmount} (${p.riskPct}%)`);
    console.log(`   Reason: ${p.reason}`);
    console.log(`   Signals: ${p.signals.join(", ") || "zone entry only"}`);
    console.log("");
  }

  // ── Step 4: Execute if in execute mode ───────────────────
  if (executeMode) {
    console.log("🔴 EXECUTING...");
    for (const p of proposals) {
      try {
        const trade = trader.executeBuy(
          p.ticker, p.shares, p.estimatedPrice, p.reason,
          p.stopLoss, p.takeProfit, p.signals
        );
        console.log(`  ✅ Bought ${trade.shares} ${trade.ticker} @ $${trade.price}`);
      } catch (err) {
        console.log(`  ❌ Failed ${p.ticker}: ${(err as Error).message}`);
      }
    }

    await save(trader, portfolioPath);

    const snapshot = trader.getSnapshot(
      Object.fromEntries(proposals.map((p) => [p.ticker, p.estimatedPrice]))
    );
    console.log(`\nPortfolio after trades: $${snapshot.totalValue} | Cash: $${snapshot.cash} | Positions: ${snapshot.openPositions}`);
  } else {
    console.log("👀 Dry run complete. Add --execute to place these trades.");
  }

  process.exit(0);
}

async function save(trader: any, path: string) {
  const { writeFile, mkdir } = await import("fs/promises");
  const { existsSync } = await import("fs");
  const dir = (await import("path")).dirname(path);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(path, trader.toJSON());
  console.log("Portfolio saved.");
}

main().catch((e) => { console.error(e); process.exit(1); });
