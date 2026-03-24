/**
 * Agent Cycle — The autonomous brain
 *
 * Run this after the daily pipeline completes.
 * It observes, thinks, proposes, auto-executes within rules, and reports.
 *
 * Usage:
 *   npx tsx scripts/agent-cycle.ts              # run full cycle
 *   npx tsx scripts/agent-cycle.ts --report     # just show latest report
 *   npx tsx scripts/agent-cycle.ts --rules      # show current rules
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { scanResults, tradingSignals, bars, vixData } = await import("../lib/db/schema");
  const { eq, desc, asc } = await import("drizzle-orm");
  const { MoneyAgent } = await import("../lib/agent/core");

  if (!db) { console.error("No database"); process.exit(1); }

  const agent = await MoneyAgent.load();

  // Handle flags
  if (process.argv.includes("--report")) {
    const report = agent.getLastReport();
    if (!report) { console.log("No report yet. Run a cycle first."); process.exit(0); }
    printReport(report);
    process.exit(0);
  }

  if (process.argv.includes("--rules")) {
    console.log("\nAgent Rules:");
    console.log(JSON.stringify(agent.getRules(), null, 2));
    process.exit(0);
  }

  // ── Run full cycle ──────────────────────────────────────
  console.log("\n🤖 MONEY OS AGENT — Running cycle...\n");

  // Load data from database
  const scanData = await db.select().from(scanResults);
  const signalData = await db.select().from(tradingSignals)
    .where(eq(tradingSignals.signalDate, new Date().toISOString().slice(0, 10)));
  const spyBars = await db.select().from(bars)
    .where(eq(bars.ticker, "SPY"))
    .orderBy(asc(bars.ts));
  const latestVix = await db.select().from(vixData)
    .orderBy(desc(vixData.date)).limit(1);

  const spyCloses = spyBars.map((b) => Number(b.close));
  const vix = latestVix.length > 0 ? Number(latestVix[0].close) : 20;

  // Build scanner input with signals attached
  const signalsByTicker = new Map<string, string[]>();
  for (const s of signalData) {
    if (s.direction === "bull") {
      const existing = signalsByTicker.get(s.ticker) ?? [];
      existing.push(s.signalType);
      signalsByTicker.set(s.ticker, existing);
    }
  }

  const scanInput = scanData.map((r) => ({
    ticker: r.ticker,
    asset: r.asset,
    price: Number(r.price),
    zone: r.zone ?? "",
    direction: r.direction ?? "",
    timeframe: r.timeframe ?? "",
    sector: r.sector,
    distanceAtr: Number(r.distanceAtr),
    signals: signalsByTicker.get(r.ticker) ?? [],
  }));

  const signalInput = signalData.map((s) => ({
    ticker: s.ticker,
    signalType: s.signalType,
    direction: s.direction ?? "",
    detail: s.detail ?? "",
  }));

  // Run the agent cycle
  const report = await agent.runCycle(scanInput, signalInput, spyCloses, vix);

  printReport(report);
  process.exit(0);
}

function printReport(report: any) {
  console.log("═".repeat(65));
  console.log(`  MONEY OS AGENT REPORT — ${report.timestamp.slice(0, 16)}`);
  console.log("═".repeat(65));

  // Portfolio
  const p = report.portfolio;
  const pnlSign = p.totalPnl >= 0 ? "+" : "";
  console.log(`\n  Portfolio: $${p.equity.toFixed(2)} | Cash: $${p.cash.toFixed(2)} | Positions: ${p.positionCount}`);
  console.log(`  Total P&L: ${pnlSign}$${p.totalPnl.toFixed(2)} (${pnlSign}${p.totalPnlPct.toFixed(2)}%)`);

  // Market
  const m = report.market;
  console.log(`\n  Market: ${m.headline}`);

  // Actions taken
  if (report.actionsTaken.length > 0) {
    console.log("\n  ACTIONS TAKEN:");
    for (const a of report.actionsTaken) {
      const icon = a.type === "buy" ? "✅" : a.type === "sell" ? "🔴" : a.type === "alert" ? "⚠️" : "⏭️";
      const auto = a.automatic ? "(auto)" : "(approved)";
      console.log(`    ${icon} ${a.ticker}: ${a.detail} ${auto}`);
    }
  }

  // Pending approvals
  if (report.pendingApprovals.length > 0) {
    console.log("\n  PENDING YOUR APPROVAL:");
    for (const p of report.pendingApprovals) {
      const conf = p.confidence === "high" ? "🟢" : p.confidence === "medium" ? "🟡" : "⚪";
      console.log(`    ${conf} BUY ${p.shares} ${p.ticker} @ ~$${p.price.toFixed(2)}`);
      console.log(`       Stop: $${p.stopLoss} | Target: $${p.takeProfit} | Risk: $${p.riskAmount} (${p.riskPct}%)`);
      console.log(`       ${p.reason}`);
    }
  }

  // Watching
  if (report.watching.length > 0) {
    console.log("\n  WATCHING:");
    for (const w of report.watching) {
      console.log(`    👀 ${w.ticker}: ${w.reason} (~${w.estimatedDays} days)`);
    }
  }

  // Performance
  const perf = report.performance;
  if (perf.totalTrades > 0) {
    console.log(`\n  PERFORMANCE: ${perf.winRate.toFixed(1)}% win rate over ${perf.totalTrades} trades`);
  }
  if (perf.insight) {
    console.log(`  INSIGHT: ${perf.insight}`);
  }

  console.log("\n" + "═".repeat(65));
}

main().catch((e) => { console.error(e); process.exit(1); });
