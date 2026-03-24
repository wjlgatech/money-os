/**
 * Daily Auto-Trader
 *
 * Reads today's scanner + signal results from the database,
 * generates trade proposals, executes approved ones.
 *
 * Auto-detects backend: Alpaca (if keys configured) or paper (local JSON).
 *
 * Run after the daily pipeline completes:
 *   npx tsx scripts/daily-auto-trader.ts [--execute] [--backend=alpaca|paper]
 *
 * Without --execute: shows proposals only (dry run)
 * With --execute: executes proposals via detected/specified backend
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { scanResults, tradingSignals, bars, watchedTickers } = await import("../lib/db/schema");
  const { eq, and, desc } = await import("drizzle-orm");
  const { latestATR } = await import("../lib/indicators/atr");
  const { TradeExecutor } = await import("../lib/broker/executor");

  if (!db) { console.error("No database"); process.exit(1); }

  const executeMode = process.argv.includes("--execute");
  const backendArg = process.argv.find((a) => a.startsWith("--backend="));
  const backendOverride = backendArg?.split("=")[1] as "paper" | "alpaca" | undefined;

  // Initialize executor (auto-detects Alpaca vs paper)
  const executor = new TradeExecutor(backendOverride);
  const portfolio = await executor.getPortfolio();
  const totalValue = portfolio.equity;

  console.log("\n📊 DAILY AUTO-TRADER");
  console.log("═".repeat(70));
  console.log(`Backend: ${portfolio.backend.toUpperCase()} ${portfolio.backend === "alpaca" ? "(broker)" : "(local)"}`);
  console.log(`Mode: ${executeMode ? "🔴 LIVE EXECUTION" : "👀 DRY RUN (add --execute to trade)"}`);
  console.log(`Portfolio: $${totalValue.toFixed(2)} | Cash: $${portfolio.cash.toFixed(2)} | Positions: ${portfolio.positions.length}`);
  console.log("");

  // ── Step 1: Show existing positions ───────────────────
  if (portfolio.positions.length > 0) {
    console.log("CURRENT POSITIONS:");
    for (const pos of portfolio.positions) {
      const pnlSign = pos.unrealizedPnl >= 0 ? "+" : "";
      console.log(`  ${pos.symbol.padEnd(6)} | ${pos.qty} shares @ $${pos.avgEntry.toFixed(2)} | now $${pos.currentPrice.toFixed(2)} | ${pnlSign}$${pos.unrealizedPnl.toFixed(2)}`);
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

    process.exit(0);
  }

  // Get signals for ENTRY zone tickers
  const today = new Date().toISOString().slice(0, 10);
  const proposals = [];

  for (const scan of entryResults) {
    // Skip if we already have a position
    if (portfolio.positions.find((p) => p.symbol === scan.ticker)) {
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

    const signalNames = bullSignals.map((s) => s.signalType);
    const riskAmount = shares * (price - stopLoss);
    const riskPct = (riskAmount / totalValue) * 100;
    let confidence: "low" | "medium" | "high" = "low";
    if (signalNames.length >= 3) confidence = "high";
    else if (signalNames.length >= 2) confidence = "medium";

    proposals.push({
      ticker: scan.ticker,
      shares,
      estimatedPrice: price,
      stopLoss,
      takeProfit,
      reason: `ENTRY zone: ${scan.direction} ${scan.timeframe} trendline, ${bullSignals.length} confirming signal(s)`,
      signals: signalNames,
      riskAmount: Number(riskAmount.toFixed(2)),
      riskPct: Number(riskPct.toFixed(2)),
      confidence,
    });
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

    process.exit(0);
  }

  // ── Step 3: Display Proposals ────────────────────────────
  console.log(`\n📋 TRADE PROPOSALS (${proposals.length})`);
  console.log("─".repeat(70));

  for (const p of proposals) {
    const conf = p.confidence === "high" ? "🟢" : p.confidence === "medium" ? "🟡" : "⚪";
    console.log(
      `${conf} BUY ${p.shares} ${p.ticker} @ ~$${p.estimatedPrice.toFixed(2)}`
    );
    console.log(`   Stop: $${p.stopLoss?.toFixed(2)} | Target: $${p.takeProfit?.toFixed(2)} | Risk: $${p.riskAmount} (${p.riskPct}%)`);
    console.log(`   Reason: ${p.reason}`);
    console.log(`   Signals: ${p.signals.join(", ") || "zone entry only"}`);
    console.log("");
  }

  // ── Step 4: Execute if in execute mode ───────────────────
  if (executeMode) {
    console.log(`🔴 EXECUTING via ${portfolio.backend.toUpperCase()}...`);
    for (const p of proposals) {
      const result = await executor.executeBuy(
        p.ticker, p.shares, p.estimatedPrice,
        p.stopLoss, p.takeProfit,
        p.reason, p.signals
      );
      if (result.success) {
        const fill = result.filledPrice ? ` @ $${result.filledPrice}` : "";
        console.log(`  ✅ ${result.ticker} ${result.shares} shares${fill} [${result.backend}] ${result.orderId ?? ""}`);
      } else {
        console.log(`  ❌ ${result.ticker}: ${result.message}`);
      }
    }

    const updated = await executor.getPortfolio();
    console.log(`\nPortfolio: $${updated.equity.toFixed(2)} | Cash: $${updated.cash.toFixed(2)} | Positions: ${updated.positions.length}`);
  } else {
    console.log(`👀 Dry run complete. Add --execute to trade via ${portfolio.backend.toUpperCase()}.`);
  }

  process.exit(0);
}



main().catch((e) => { console.error(e); process.exit(1); });
