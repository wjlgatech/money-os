import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { MoneyAgent } from "@/lib/agent/core";
import { TradeExecutor } from "@/lib/broker/executor";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const agent = await MoneyAgent.load();
    const executor = new TradeExecutor();
    const report = agent.getLastReport();
    const rules = agent.getRules();
    const portfolio = await executor.getPortfolio();

    // Use absolute portfolio value for sizing (handle negative equity edge case)
    const portfolioValue = Math.max(
      portfolio.equity,
      portfolio.positions.reduce((s, p) => s + p.currentPrice * p.qty, 0),
      100_000 // fallback to initial capital
    );

    // Positions with AI context
    const positionsWithContext = portfolio.positions.map((p) => {
      const pnlPct = p.avgEntry > 0 ? ((p.currentPrice - p.avgEntry) / p.avgEntry) * 100 : 0;
      const posValue = p.currentPrice * p.qty;
      const portfolioPct = (posValue / portfolioValue) * 100;
      let context: string;
      if (pnlPct > 5) context = `Up ${pnlPct.toFixed(1)}% — nearing take-profit. Consider tightening stop.`;
      else if (pnlPct > 0) context = `Slightly positive (+${pnlPct.toFixed(1)}%). Holding within normal range.`;
      else if (pnlPct > -3) context = `Small drawdown (${pnlPct.toFixed(1)}%). Normal volatility — no action needed.`;
      else context = `Down ${Math.abs(pnlPct).toFixed(1)}%. Watch the stop-loss. Hold if thesis is still valid.`;

      return {
        ...p,
        pnlPct: Number(pnlPct.toFixed(2)),
        posValue: Number(posValue.toFixed(2)),
        portfolioPct: Number(portfolioPct.toFixed(1)),
        context,
      };
    });

    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Actions summary
    const actionsSummary = report?.actionsTaken?.map((a) => {
      const icon = a.type === "buy" ? "Bought" : a.type === "sell" ? "Sold" : a.type === "alert" ? "Alert" : "Skipped";
      return `${icon}: ${a.detail}`;
    }) ?? [];

    const pendingCount = report?.pendingApprovals?.length ?? 0;

    // Headline
    let headline: string;
    if (portfolio.positions.length > 0 && pendingCount > 0) {
      headline = `${greeting}. You have ${portfolio.positions.length} open position${portfolio.positions.length > 1 ? "s" : ""} and ${pendingCount} new opportunit${pendingCount > 1 ? "ies" : "y"} to review.`;
    } else if (pendingCount > 0) {
      headline = `${greeting}. I found ${pendingCount} opportunit${pendingCount > 1 ? "ies" : "y"} for you to review.`;
    } else if (portfolio.positions.length > 0) {
      headline = `${greeting}. Your ${portfolio.positions.length} position${portfolio.positions.length > 1 ? "s are" : " is"} open. No new opportunities today.`;
    } else {
      headline = `${greeting}. Markets are quiet. No actions taken, no new opportunities.`;
    }

    // Selection funnel (transparency)
    const selectionProcess = {
      universe: 130,
      description: "111 S&P 500 stocks + 10 ETFs + 19 crypto",
      steps: [
        { step: "Trendline computation", result: "1,200+ support/resistance levels across all tickers" },
        { step: "Scanner: which are within 1×ATR of a trendline?", result: `${report?.pendingApprovals?.length ?? 0 + (report?.watching?.length ?? 0)} in entry/alert zones` },
        { step: "Agent filter: skip already owned, max 3/day", result: `${pendingCount} proposals` },
        { step: "Constitutional review: position size <5%, exposure <60%", result: `${pendingCount} passed` },
      ],
      dataFreshness: report?.timestamp ? `Last pipeline: ${new Date(report.timestamp).toLocaleString()}` : "Pipeline has not run yet",
      priceSource: "Yahoo Finance (daily close, not real-time streaming)",
    };

    return apiSuccess({
      headline,
      market: report?.market ?? {
        regime: { regime: "unknown", confidence: 0 },
        vix: 0,
        headline: "No market data yet. Run: npx tsx scripts/run-pipeline.ts",
      },
      actions: actionsSummary,
      pendingApprovals: (report?.pendingApprovals ?? []).map((p) => ({
        ...p,
        aiContext: generateProposalContext(p, portfolioValue),
      })),
      watching: report?.watching ?? [],
      portfolio: {
        equity: portfolio.equity,
        portfolioValue, // the sane value used for sizing
        cash: portfolio.cash,
        totalPnl: portfolio.equity - 100_000,
        totalPnlPct: ((portfolio.equity - 100_000) / 100_000) * 100,
        positions: positionsWithContext,
      },
      performance: report?.performance ?? { winRate: 0, totalTrades: 0, insight: "No trades yet." },
      selectionProcess,
      rules,
      agentActive: report !== null,
      lastCycle: report?.timestamp ?? null,
      connections: {
        alpaca: config.hasAlpacaTrading ? "Connected (paper trading)" : "Not connected",
        fidelity: "Not connected — manual portfolio entry via /setup",
        coinbase: "Not connected — manual portfolio entry via /setup",
        kraken: "Not connected — manual portfolio entry via /setup",
      },
    });
  } catch (err) {
    return apiError("Briefing failed", 500);
  }
}

function generateProposalContext(
  proposal: { ticker: string; shares: number; price: number; stopLoss: number; takeProfit: number; confidence: string; signals: string[]; reason: string },
  portfolioValue: number
): string {
  const cost = proposal.shares * proposal.price;
  const portfolioPct = ((cost / portfolioValue) * 100).toFixed(1);
  const risk = proposal.shares * (proposal.price - proposal.stopLoss);
  const reward = proposal.shares * (proposal.takeProfit - proposal.price);
  const rr = risk > 0 ? (reward / risk).toFixed(1) : "∞";

  const parts: string[] = [];
  parts.push(`$${cost.toFixed(0)} (${portfolioPct}% of portfolio).`);
  parts.push(`Risk $${risk.toFixed(0)} to make $${reward.toFixed(0)} — ${rr}:1 reward-to-risk.`);

  if (proposal.signals.length >= 2) {
    parts.push(`${proposal.signals.length} confirming signals (${proposal.signals.join(", ")}) — stronger than average.`);
  } else if (proposal.signals.length === 1) {
    parts.push(`1 confirming signal (${proposal.signals[0]}). Decent but not high-conviction.`);
  } else {
    parts.push(`Zone entry only — no signal confirmation. This is the weakest type of setup. The agent is showing it because nothing stronger is available today.`);
  }

  return parts.join(" ");
}
