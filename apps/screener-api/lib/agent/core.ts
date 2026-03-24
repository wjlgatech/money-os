/**
 * Money OS Agent — The Core Loop
 *
 * This is the brain. It observes, thinks, proposes, executes, and monitors.
 * The human only touches the approval gate. Everything else is autonomous.
 *
 * Architecture:
 *   cron triggers → agent.runCycle() → produces AgentReport
 *   AgentReport is consumed by: morning briefing, evening report, push notifications
 */

import { config } from "../config";
import { TradeExecutor, type ExecutionResult } from "../broker/executor";
import { TradeGate } from "../engine/tradeGate";
import { detectRegime, type RegimeResult } from "../indicators/regime";
import { constitutionalReview, reviewVerdict, type TradeContext } from "./constitution";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ── Types ────────────────────────────────────────────────────

export interface AgentReport {
  timestamp: string;
  type: "morning" | "evening" | "alert";

  // Portfolio state
  portfolio: {
    equity: number;
    cash: number;
    positionCount: number;
    dayPnl: number;
    dayPnlPct: number;
    totalPnl: number;
    totalPnlPct: number;
  };

  // What the agent did
  actionsTaken: AgentAction[];

  // What needs human approval
  pendingApprovals: PendingApproval[];

  // What the agent is watching
  watching: WatchItem[];

  // Market context
  market: {
    regime: RegimeResult;
    vix: number;
    headline: string;
  };

  // Performance tracking
  performance: {
    winRate: number;
    totalTrades: number;
    bestSector: string | null;
    worstSector: string | null;
    insight: string;
  };
}

export interface AgentAction {
  type: "buy" | "sell" | "adjust_stop" | "alert" | "skip";
  ticker: string;
  detail: string;
  result?: ExecutionResult;
  automatic: boolean; // true = no human approval needed
}

export interface PendingApproval {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  signals: string[];
  riskAmount: number;
  riskPct: number;
  confidence: "low" | "medium" | "high";
}

export interface WatchItem {
  ticker: string;
  reason: string;
  estimatedDays: number;
  type: "approaching_support" | "approaching_resistance" | "earnings" | "divergence_forming";
}

// ── Agent Rules ──────────────────────────────────────────────

export interface AgentRules {
  /** Auto-execute sells when stop-loss is hit (always true — non-negotiable) */
  autoStopLoss: true;

  /** Auto-execute sells when take-profit is hit */
  autoTakeProfit: boolean;

  /** Auto-execute buys below this dollar amount */
  autoBuyBelow: number;

  /** Auto-execute buys when confidence is this or higher */
  autoBuyConfidence: "high" | "medium" | "none";

  /** Maximum number of new positions per day */
  maxNewPositionsPerDay: number;

  /** Pause all new entries (emergency brake) */
  pauseNewEntries: boolean;

  /** VIX threshold to auto-pause entries */
  vixPauseThreshold: number;

  /** Maximum portfolio exposure (% invested) */
  maxExposurePct: number;
}

const DEFAULT_RULES: AgentRules = {
  autoStopLoss: true,                // always protect capital
  autoTakeProfit: true,              // take wins automatically
  autoBuyBelow: 0,                   // all buys need approval by default
  autoBuyConfidence: "none",         // all buys need approval by default
  maxNewPositionsPerDay: 3,
  pauseNewEntries: false,
  vixPauseThreshold: 35,            // pause in panic markets
  maxExposurePct: 50,               // never more than 50% invested
};

// ── Agent State ──────────────────────────────────────────────

interface AgentState {
  rules: AgentRules;
  reports: AgentReport[];          // last 30 days of reports
  tradeLog: AgentAction[];         // all actions ever taken
  strategySectorStats: Record<string, { wins: number; losses: number }>;
  lastCycleAt: string | null;
}

const STATE_PATH = path.join(process.cwd(), "data", "agent-state.json");

// ── The Agent ────────────────────────────────────────────────

export class MoneyAgent {
  private state: AgentState;
  private executor: TradeExecutor;
  private gate: TradeGate;

  constructor(state?: AgentState) {
    this.state = state ?? {
      rules: { ...DEFAULT_RULES },
      reports: [],
      tradeLog: [],
      strategySectorStats: {},
      lastCycleAt: null,
    };
    this.executor = new TradeExecutor();
    this.gate = new TradeGate();
  }

  // ── Run a Cycle ──────────────────────────────────────────

  /**
   * Run one complete agent cycle.
   * Called by cron after pipeline completes.
   *
   * @param scanResults - today's scanner output
   * @param signals - today's signals
   * @param spyCloses - SPY closes for regime detection
   * @param vix - current VIX value
   */
  async runCycle(
    scanResults: Array<{
      ticker: string;
      asset: string;
      price: number;
      zone: string;
      direction: string;
      timeframe: string;
      sector: string | null;
      distanceAtr: number;
      signals?: string[];
    }>,
    signals: Array<{
      ticker: string;
      signalType: string;
      direction: string;
      detail: string;
    }>,
    spyCloses: number[],
    vix: number
  ): Promise<AgentReport> {
    const actions: AgentAction[] = [];
    const pendingApprovals: PendingApproval[] = [];
    const watching: WatchItem[] = [];

    // ── Observe: market regime ────────────────────────────
    const regime = detectRegime(spyCloses);

    // ── Think: should we pause? ──────────────────────────
    if (vix >= this.state.rules.vixPauseThreshold) {
      actions.push({
        type: "alert",
        ticker: "MARKET",
        detail: `VIX at ${vix} — above ${this.state.rules.vixPauseThreshold} threshold. New entries paused automatically.`,
        automatic: true,
      });
    }

    // ── Execute: check exits on existing positions ───────
    const portfolio = await this.executor.getPortfolio();
    // Stop-loss and take-profit checks would happen via Alpaca's
    // bracket orders (already set on entry). Log any fills.

    // ── Propose: new entries ─────────────────────────────
    const entryZone = scanResults.filter((r) => r.zone === "ENTRY");
    const alertZone = scanResults.filter((r) => r.zone === "ALERT");

    // Deduplicate by ticker, keep best
    const bestByTicker = new Map<string, typeof entryZone[0]>();
    for (const r of entryZone) {
      const existing = bestByTicker.get(r.ticker);
      if (!existing || (r.signals?.length ?? 0) > (existing.signals?.length ?? 0)) {
        bestByTicker.set(r.ticker, r);
      }
    }

    // Skip tickers we already own
    const ownedTickers = new Set(portfolio.positions.map((p) => p.symbol));
    const candidates = [...bestByTicker.values()]
      .filter((r) => !ownedTickers.has(r.ticker))
      .slice(0, this.state.rules.maxNewPositionsPerDay);

    // Check exposure limit
    const currentExposure = (portfolio.equity - portfolio.cash) / portfolio.equity;
    const canBuyMore = currentExposure < this.state.rules.maxExposurePct / 100;

    if (
      !canBuyMore ||
      this.state.rules.pauseNewEntries ||
      vix >= this.state.rules.vixPauseThreshold
    ) {
      for (const c of candidates) {
        actions.push({
          type: "skip",
          ticker: c.ticker,
          detail: !canBuyMore
            ? `Exposure at ${(currentExposure * 100).toFixed(1)}% — above ${this.state.rules.maxExposurePct}% limit`
            : vix >= this.state.rules.vixPauseThreshold
            ? `VIX ${vix} — above panic threshold`
            : "New entries paused by user",
          automatic: true,
        });
      }
    } else {
      for (const c of candidates) {
        // Position sizing: 3% of portfolio, risk-based
        const posSize = portfolio.equity * 0.03;
        const shares = Math.floor(posSize / c.price);
        if (shares <= 0) continue;

        const atrEstimate = c.price * 0.03; // rough 3% ATR estimate
        const stopLoss = Number((c.price - 2 * atrEstimate).toFixed(2));
        const takeProfit = Number((c.price * 1.08).toFixed(2));
        const riskAmount = shares * (c.price - stopLoss);
        const riskPct = (riskAmount / portfolio.equity) * 100;

        const signalNames = c.signals ?? [];
        let confidence: "low" | "medium" | "high" = "low";
        if (signalNames.length >= 3) confidence = "high";
        else if (signalNames.length >= 2) confidence = "medium";

        // ── Constitutional review (non-negotiable) ──────────
        const tradeCtx: TradeContext = {
          ticker: c.ticker,
          side: "buy",
          shares,
          price: c.price,
          portfolioEquity: portfolio.equity,
          portfolioCash: portfolio.cash,
          currentPositionCount: portfolio.positions.length,
          existingPositionInTicker: ownedTickers.has(c.ticker),
          regime: regime.regime,
          vix,
          signalCount: signalNames.length,
          dayTradeCount: actions.filter((a) => a.type === "buy").length,
        };
        const checks = constitutionalReview(tradeCtx);
        const verdict = reviewVerdict(checks);

        if (!verdict.approved) {
          actions.push({
            type: "skip",
            ticker: c.ticker,
            detail: `Constitutional BLOCK: ${verdict.reasoning}`,
            automatic: true,
          });
          continue;
        }

        // Check auto-approval rules
        const cost = shares * c.price;
        const autoApprove =
          cost <= this.state.rules.autoBuyBelow ||
          (confidence === "high" && this.state.rules.autoBuyConfidence === "high") ||
          (confidence !== "low" && this.state.rules.autoBuyConfidence === "medium");

        if (autoApprove) {
          // Execute immediately
          const result = await this.executor.executeBuy(
            c.ticker, shares, c.price, stopLoss, takeProfit,
            `Agent auto-buy: ${c.direction} ${c.timeframe} support, ${signalNames.length} signals. Constitutional: ${verdict.reasoning}`,
            signalNames
          );
          actions.push({
            type: "buy",
            ticker: c.ticker,
            detail: `Auto-bought ${shares} @ $${c.price} (${confidence} confidence)`,
            result,
            automatic: true,
          });
        } else {
          // Queue for human approval
          pendingApprovals.push({
            id: crypto.randomUUID(),
            ticker: c.ticker,
            side: "buy",
            shares,
            price: c.price,
            stopLoss,
            takeProfit,
            reason: `ENTRY zone: ${c.direction} ${c.timeframe} trendline, ${signalNames.length} confirming signal(s)`,
            signals: signalNames,
            riskAmount: Number(riskAmount.toFixed(2)),
            riskPct: Number(riskPct.toFixed(2)),
            confidence,
          });
        }
      }
    }

    // ── Watch: alert zone items ──────────────────────────
    for (const r of alertZone.slice(0, 5)) {
      if (ownedTickers.has(r.ticker)) continue;
      watching.push({
        ticker: r.ticker,
        reason: `Approaching ${r.direction} at ${r.timeframe} trendline (${r.distanceAtr.toFixed(1)} ATR away)`,
        estimatedDays: Math.ceil(r.distanceAtr * 2),
        type: r.direction === "support" ? "approaching_support" : "approaching_resistance",
      });
    }

    // ── Performance stats ────────────────────────────────
    const totalActions = this.state.tradeLog.filter((a) => a.type === "buy" || a.type === "sell");
    const wins = totalActions.filter((a) => a.result?.success && a.type === "sell");

    // Find best/worst sector from history
    let bestSector: string | null = null;
    let worstSector: string | null = null;
    let bestRate = 0;
    let worstRate = 1;
    for (const [sector, stats] of Object.entries(this.state.strategySectorStats)) {
      const total = stats.wins + stats.losses;
      if (total < 2) continue;
      const rate = stats.wins / total;
      if (rate > bestRate) { bestRate = rate; bestSector = sector; }
      if (rate < worstRate) { worstRate = rate; worstSector = sector; }
    }

    // ── Build report ─────────────────────────────────────
    const report: AgentReport = {
      timestamp: new Date().toISOString(),
      type: new Date().getHours() < 12 ? "morning" : "evening",
      portfolio: {
        equity: portfolio.equity,
        cash: portfolio.cash,
        positionCount: portfolio.positions.length,
        dayPnl: 0,  // would need yesterday's equity to compute
        dayPnlPct: 0,
        totalPnl: portfolio.equity - config.initialCapital,
        totalPnlPct: ((portfolio.equity - config.initialCapital) / config.initialCapital) * 100,
      },
      actionsTaken: actions,
      pendingApprovals,
      watching,
      market: {
        regime,
        vix,
        headline: this.generateHeadline(regime, vix),
      },
      performance: {
        winRate: totalActions.length > 0 ? (wins.length / totalActions.length) * 100 : 0,
        totalTrades: totalActions.length,
        bestSector,
        worstSector,
        insight: this.generateInsight(regime, portfolio, bestSector, worstSector),
      },
    };

    // Save state
    this.state.tradeLog.push(...actions);
    this.state.reports.push(report);
    if (this.state.reports.length > 30) this.state.reports.shift();
    this.state.lastCycleAt = report.timestamp;

    await this.save();
    return report;
  }

  // ── Human Approval ───────────────────────────────────────

  async approveProposal(approval: PendingApproval): Promise<ExecutionResult> {
    const result = await this.executor.executeBuy(
      approval.ticker,
      approval.shares,
      approval.price,
      approval.stopLoss,
      approval.takeProfit,
      `Human-approved: ${approval.reason}`,
      approval.signals
    );

    this.state.tradeLog.push({
      type: "buy",
      ticker: approval.ticker,
      detail: `Approved and executed: ${approval.shares} shares @ $${approval.price}`,
      result,
      automatic: false,
    });

    // Remove from pending in the last report
    this.removeFromPending(approval.id);
    await this.save();
    return result;
  }

  skipProposal(proposalId: string): boolean {
    const removed = this.removeFromPending(proposalId);
    if (removed) {
      this.state.tradeLog.push({
        type: "skip",
        ticker: removed.ticker,
        detail: `Skipped by user: ${removed.reason}`,
        automatic: false,
      });
    }
    // Save is async but we don't need to await in the caller
    this.save();
    return !!removed;
  }

  private removeFromPending(proposalId: string): PendingApproval | null {
    const lastReport = this.state.reports[this.state.reports.length - 1];
    if (!lastReport) return null;
    const idx = lastReport.pendingApprovals.findIndex((p) => p.id === proposalId);
    if (idx === -1) return null;
    return lastReport.pendingApprovals.splice(idx, 1)[0];
  }

  // ── Rules Management ─────────────────────────────────────

  getRules(): AgentRules {
    return { ...this.state.rules };
  }

  updateRules(updates: Partial<AgentRules>) {
    this.state.rules = { ...this.state.rules, ...updates };
  }

  getLastReport(): AgentReport | null {
    return this.state.reports.length > 0
      ? this.state.reports[this.state.reports.length - 1]
      : null;
  }

  // ── Intelligence ─────────────────────────────────────────

  private generateHeadline(regime: RegimeResult, vix: number): string {
    const vixDesc = vix < 15 ? "calm" : vix < 20 ? "normal" : vix < 25 ? "nervous" : vix < 30 ? "fearful" : "panicking";
    return `Market is ${regime.regime} (${(regime.confidence * 100).toFixed(0)}% confidence). VIX ${vix.toFixed(1)} — ${vixDesc}.`;
  }

  private generateInsight(
    regime: RegimeResult,
    portfolio: Awaited<ReturnType<TradeExecutor["getPortfolio"]>>,
    bestSector: string | null,
    worstSector: string | null
  ): string {
    const parts: string[] = [];

    if (bestSector) {
      parts.push(`Your best-performing sector is ${bestSector}.`);
    }
    if (worstSector && worstSector !== bestSector) {
      parts.push(`${worstSector} has been underperforming — consider reducing exposure.`);
    }
    if (regime.regime === "bear") {
      parts.push("Bear market regime — prioritizing capital preservation over new entries.");
    }
    if (regime.regime === "sideways") {
      parts.push("Sideways market — tighter profit targets and smaller positions recommended.");
    }
    if (parts.length === 0) {
      parts.push("Continuing to execute within strategy parameters. No adjustments needed.");
    }

    return parts.join(" ");
  }

  // ── Persistence ──────────────────────────────────────────

  async save() {
    const dir = path.dirname(STATE_PATH);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(STATE_PATH, JSON.stringify(this.state, null, 2));
  }

  static async load(): Promise<MoneyAgent> {
    try {
      const json = await readFile(STATE_PATH, "utf8");
      return new MoneyAgent(JSON.parse(json));
    } catch {
      return new MoneyAgent();
    }
  }
}
