import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { MoneyAgent } from "@/lib/agent/core";
import { TradeExecutor } from "@/lib/broker/executor";

/**
 * GET /api/briefing — The agent's morning/evening briefing
 *
 * Returns everything the dashboard needs in one call:
 * - Agent report (actions, pending approvals, watchlist, insights)
 * - Portfolio snapshot with per-position context
 * - Market context (regime, VIX, headline)
 * - AI-generated narratives for each element
 */
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const agent = await MoneyAgent.load();
    const executor = new TradeExecutor();
    const report = agent.getLastReport();
    const rules = agent.getRules();
    const portfolio = await executor.getPortfolio();

    // Generate AI context for positions
    const positionsWithContext = portfolio.positions.map((p) => {
      const pnlPct = p.avgEntry > 0 ? ((p.currentPrice - p.avgEntry) / p.avgEntry) * 100 : 0;
      let context: string;
      if (pnlPct > 5) {
        context = `Up ${pnlPct.toFixed(1)}% — approaching take-profit zone. Consider tightening stop.`;
      } else if (pnlPct > 0) {
        context = `Slightly positive. Holding within normal range.`;
      } else if (pnlPct > -3) {
        context = `Small drawdown — within normal volatility. No action needed.`;
      } else {
        context = `Down ${Math.abs(pnlPct).toFixed(1)}% — watch the stop-loss level. If the thesis is still valid, hold.`;
      }
      return { ...p, pnlPct: Number(pnlPct.toFixed(2)), context };
    });

    // Generate greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Build the narrative
    const actionsSummary = report?.actionsTaken?.length
      ? report.actionsTaken.map((a) => {
          const icon = a.type === "buy" ? "Bought" : a.type === "sell" ? "Sold" : a.type === "alert" ? "Alert" : "Skipped";
          return `${icon}: ${a.detail}`;
        })
      : [];

    const pendingCount = report?.pendingApprovals?.length ?? 0;
    const watchCount = report?.watching?.length ?? 0;

    let headline: string;
    if (actionsSummary.length > 0 && pendingCount > 0) {
      headline = `${greeting}. I took ${actionsSummary.length} action${actionsSummary.length > 1 ? "s" : ""} and found ${pendingCount} new opportunit${pendingCount > 1 ? "ies" : "y"} that need${pendingCount === 1 ? "s" : ""} your approval.`;
    } else if (pendingCount > 0) {
      headline = `${greeting}. I found ${pendingCount} opportunit${pendingCount > 1 ? "ies" : "y"} for you to review.`;
    } else if (actionsSummary.length > 0) {
      headline = `${greeting}. I took ${actionsSummary.length} action${actionsSummary.length > 1 ? "s" : ""} on your behalf. No new opportunities today.`;
    } else {
      headline = `${greeting}. Markets are quiet — no actions taken, no new opportunities. Your positions are holding.`;
    }

    return apiSuccess({
      headline,
      market: report?.market ?? {
        regime: { regime: "unknown", confidence: 0 },
        vix: 0,
        headline: "No market data yet. Run the pipeline first.",
      },
      actions: actionsSummary,
      pendingApprovals: (report?.pendingApprovals ?? []).map((p) => ({
        ...p,
        // AI context for each proposal
        aiContext: generateProposalContext(p, portfolio),
      })),
      watching: report?.watching ?? [],
      portfolio: {
        equity: portfolio.equity,
        cash: portfolio.cash,
        totalPnl: portfolio.equity - 100_000,
        totalPnlPct: ((portfolio.equity - 100_000) / 100_000) * 100,
        positions: positionsWithContext,
      },
      performance: report?.performance ?? { winRate: 0, totalTrades: 0, insight: "No trades yet." },
      rules,
      agentActive: report !== null,
      lastCycle: report?.timestamp ?? null,
    });
  } catch (err) {
    return apiError("Briefing failed", 500);
  }
}

function generateProposalContext(
  proposal: { ticker: string; shares: number; price: number; stopLoss: number; takeProfit: number; confidence: string; signals: string[]; reason: string },
  portfolio: { equity: number; cash: number; positions: Array<{ symbol: string }> }
): string {
  const cost = proposal.shares * proposal.price;
  const portfolioPct = ((cost / portfolio.equity) * 100).toFixed(1);
  const risk = proposal.shares * (proposal.price - proposal.stopLoss);
  const reward = proposal.shares * (proposal.takeProfit - proposal.price);
  const rr = risk > 0 ? (reward / risk).toFixed(1) : "∞";

  const parts: string[] = [];

  // Position sizing context
  parts.push(`$${cost.toFixed(0)} (${portfolioPct}% of portfolio).`);

  // Risk/reward
  parts.push(`Risk $${risk.toFixed(0)} to make $${reward.toFixed(0)} — ${rr}:1 reward-to-risk.`);

  // Signal quality
  if (proposal.signals.length >= 2) {
    parts.push(`${proposal.signals.length} confirming signals (${proposal.signals.join(", ")}) — stronger than average.`);
  } else if (proposal.signals.length === 1) {
    parts.push(`1 confirming signal (${proposal.signals[0]}). Decent but not high-conviction.`);
  } else {
    parts.push(`Zone entry only — no signal confirmation. Weakest type of setup.`);
  }

  return parts.join(" ");
}
