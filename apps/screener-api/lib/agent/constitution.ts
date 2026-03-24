/**
 * Agent Constitution — The Non-Negotiable Rules
 *
 * Inspired by Anthropic's Constitutional AI approach.
 * These are the principles the agent ALWAYS follows,
 * regardless of strategy, market conditions, or user requests.
 *
 * Priority hierarchy (highest first):
 * 1. Capital preservation (never risk ruin)
 * 2. Transparency (always explain reasoning)
 * 3. Human control (escalate when uncertain)
 * 4. Strategy discipline (follow the rules, not emotions)
 * 5. Performance (make money)
 */

export interface ConstitutionalCheck {
  rule: string;
  passed: boolean;
  reason: string;
  severity: "block" | "warn" | "info";
}

export interface TradeContext {
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  portfolioEquity: number;
  portfolioCash: number;
  currentPositionCount: number;
  existingPositionInTicker: boolean;
  regime: "bull" | "bear" | "sideways";
  vix: number;
  signalCount: number;
  dayTradeCount: number;
}

/**
 * Run all constitutional checks on a proposed trade.
 * Returns list of checks — any "block" severity stops the trade.
 */
export function constitutionalReview(ctx: TradeContext): ConstitutionalCheck[] {
  const checks: ConstitutionalCheck[] = [];

  // ── CAPITAL PRESERVATION (highest priority) ────────────

  // Rule 1: Never risk more than 2% of portfolio on a single trade
  const tradeValue = ctx.shares * ctx.price;
  const portfolioPct = (tradeValue / ctx.portfolioEquity) * 100;
  if (portfolioPct > 5) {
    checks.push({
      rule: "Single trade cannot exceed 5% of portfolio",
      passed: false,
      reason: `This trade is ${portfolioPct.toFixed(1)}% of portfolio ($${tradeValue.toFixed(0)} of $${ctx.portfolioEquity.toFixed(0)})`,
      severity: "block",
    });
  } else {
    checks.push({
      rule: "Position size within limits",
      passed: true,
      reason: `${portfolioPct.toFixed(1)}% of portfolio — within 5% limit`,
      severity: "info",
    });
  }

  // Rule 2: Never invest more than 50% of portfolio total
  const totalExposure = ((ctx.portfolioEquity - ctx.portfolioCash + tradeValue) / ctx.portfolioEquity) * 100;
  if (totalExposure > 60) {
    checks.push({
      rule: "Total exposure cannot exceed 60%",
      passed: false,
      reason: `After this trade, exposure would be ${totalExposure.toFixed(1)}%`,
      severity: "block",
    });
  } else if (totalExposure > 50) {
    checks.push({
      rule: "Exposure approaching limit",
      passed: true,
      reason: `Exposure at ${totalExposure.toFixed(1)}% — approaching 60% hard limit`,
      severity: "warn",
    });
  }

  // Rule 3: Must have enough cash (no margin)
  if (tradeValue > ctx.portfolioCash) {
    checks.push({
      rule: "Cannot trade on margin — cash only",
      passed: false,
      reason: `Need $${tradeValue.toFixed(0)} but only $${ctx.portfolioCash.toFixed(0)} cash available`,
      severity: "block",
    });
  }

  // Rule 4: No buying in panic markets (VIX > 40)
  if (ctx.side === "buy" && ctx.vix > 40) {
    checks.push({
      rule: "No new buys when VIX > 40 (extreme panic)",
      passed: false,
      reason: `VIX is ${ctx.vix} — market in extreme panic. Wait for VIX < 35 before new entries.`,
      severity: "block",
    });
  } else if (ctx.side === "buy" && ctx.vix > 30) {
    checks.push({
      rule: "Elevated VIX caution",
      passed: true,
      reason: `VIX is ${ctx.vix} — market fearful. Reducing position size recommended.`,
      severity: "warn",
    });
  }

  // ── TRANSPARENCY ───────────────────────────────────────

  // Rule 5: Every trade must have a stated reason
  if (ctx.signalCount === 0 && ctx.side === "buy") {
    checks.push({
      rule: "Buys require at least one confirming signal",
      passed: true,
      reason: "No confirming signals — entry based on zone proximity only. Lower confidence.",
      severity: "warn",
    });
  }

  // ── HUMAN CONTROL ──────────────────────────────────────

  // Rule 6: Max trades per day
  if (ctx.dayTradeCount >= 5) {
    checks.push({
      rule: "Maximum 5 trades per day",
      passed: false,
      reason: `Already ${ctx.dayTradeCount} trades today. Excessive trading erodes returns.`,
      severity: "block",
    });
  }

  // Rule 7: Don't double down (no adding to losing positions)
  if (ctx.existingPositionInTicker && ctx.side === "buy") {
    checks.push({
      rule: "Caution: adding to existing position",
      passed: true,
      reason: `Already holding ${ctx.ticker}. Adding increases concentration risk.`,
      severity: "warn",
    });
  }

  // ── STRATEGY DISCIPLINE ────────────────────────────────

  // Rule 8: Don't buy support bounces in bear markets
  if (ctx.regime === "bear" && ctx.side === "buy") {
    checks.push({
      rule: "Bear market — support bounces unreliable",
      passed: true,
      reason: "Market regime is bearish. Support levels are more likely to break than hold. Reduced position size applied.",
      severity: "warn",
    });
  }

  return checks;
}

/**
 * Summarize constitutional review into a decision.
 */
export function reviewVerdict(checks: ConstitutionalCheck[]): {
  approved: boolean;
  blocked: ConstitutionalCheck[];
  warnings: ConstitutionalCheck[];
  reasoning: string;
} {
  const blocked = checks.filter((c) => !c.passed && c.severity === "block");
  const warnings = checks.filter((c) => c.severity === "warn");

  const approved = blocked.length === 0;

  let reasoning: string;
  if (!approved) {
    reasoning = `BLOCKED: ${blocked.map((b) => b.reason).join(". ")}`;
  } else if (warnings.length > 0) {
    reasoning = `APPROVED with cautions: ${warnings.map((w) => w.reason).join(". ")}`;
  } else {
    reasoning = "APPROVED: all constitutional checks passed.";
  }

  return { approved, blocked, warnings, reasoning };
}
