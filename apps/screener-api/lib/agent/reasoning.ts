/**
 * Reasoning Chain — Transparent Decision Making
 *
 * Every agent action must produce a reasoning chain showing:
 * 1. What the agent observed
 * 2. What it considered
 * 3. What it decided and WHY
 * 4. What it's uncertain about
 *
 * Per Anthropic: "Show agent planning steps in real-time.
 * Overconfidence is the #1 failure mode — agents predict 73% success
 * when actual rate is 35%."
 */

export interface ReasoningStep {
  step: string;
  observation: string;
  conclusion: string;
  confidence: "high" | "medium" | "low" | "unknown";
}

export interface ReasoningChain {
  ticker: string;
  action: string;
  steps: ReasoningStep[];
  finalDecision: string;
  uncertainties: string[];
  overallConfidence: "high" | "medium" | "low";
}

/**
 * Build a reasoning chain for a buy decision.
 * The chain must be honest — if the evidence is weak, say so.
 */
export function buildBuyReasoning(
  ticker: string,
  data: {
    price: number;
    zone: string;
    direction: string;
    timeframe: string;
    distanceAtr: number;
    signals: string[];
    regime: string;
    vix: number;
    sectorExposure: number; // current % of portfolio in this sector
    targetSectorExposure: number;
  }
): ReasoningChain {
  const steps: ReasoningStep[] = [];
  const uncertainties: string[] = [];

  // Step 1: Is price at a significant level?
  const zoneConf = data.zone === "ENTRY" ? "medium" : "low";
  steps.push({
    step: "Price level significance",
    observation: `${ticker} is ${data.distanceAtr.toFixed(1)}×ATR from ${data.timeframe} ${data.direction} (${data.zone} zone)`,
    conclusion: data.zone === "ENTRY"
      ? "Price is at a historically significant level — buyers have stepped in here before."
      : "Price is approaching but not yet at the level. Early, but watching.",
    confidence: zoneConf,
  });

  // Step 2: Do technical signals confirm?
  const signalConf = data.signals.length >= 2 ? "medium" : data.signals.length === 1 ? "low" : "low";
  if (data.signals.length > 0) {
    steps.push({
      step: "Signal confirmation",
      observation: `${data.signals.length} confirming signal(s): ${data.signals.join(", ")}`,
      conclusion: data.signals.length >= 2
        ? "Multiple indicators agree — stronger than a single signal."
        : "Only one confirming signal. Coin-flip territory.",
      confidence: signalConf,
    });
  } else {
    steps.push({
      step: "Signal confirmation",
      observation: "No confirming signals from RSI, MACD, or divergence indicators.",
      conclusion: "Zone entry only — no momentum confirmation. Weakest type of entry.",
      confidence: "low",
    });
    uncertainties.push("No technical confirmation beyond trendline proximity.");
  }

  // Step 3: Is the market regime favorable?
  const regimeConf = data.regime === "bull" ? "high" : data.regime === "sideways" ? "medium" : "low";
  steps.push({
    step: "Market regime",
    observation: `SPY regime: ${data.regime} | VIX: ${data.vix}`,
    conclusion: data.regime === "bull"
      ? "Bullish environment — support bounces are reliable."
      : data.regime === "sideways"
      ? "Sideways market — support bounces are less reliable. Smaller position warranted."
      : "Bearish environment — support levels frequently break. High risk of stop-loss hit.",
    confidence: regimeConf,
  });
  if (data.regime === "bear") {
    uncertainties.push("Bear market — historical support levels are breaking across the board.");
  }
  if (data.vix > 25) {
    uncertainties.push(`VIX at ${data.vix} — elevated fear means wider price swings and more false signals.`);
  }

  // Step 4: Portfolio fit
  const fitConf = data.sectorExposure < data.targetSectorExposure ? "high" : "low";
  steps.push({
    step: "Portfolio fit",
    observation: `Sector exposure: ${(data.sectorExposure * 100).toFixed(0)}% (target: ${(data.targetSectorExposure * 100).toFixed(0)}%)`,
    conclusion: data.sectorExposure < data.targetSectorExposure
      ? "Underweight in this sector — adding here improves diversification."
      : "Already at or above target exposure — adding increases concentration risk.",
    confidence: fitConf,
  });
  if (data.sectorExposure >= data.targetSectorExposure) {
    uncertainties.push("Adding to an already full sector allocation.");
  }

  // Overall confidence: minimum of all step confidences
  const confLevels = steps.map((s) => s.confidence);
  const overallConfidence: "high" | "medium" | "low" =
    confLevels.includes("low") ? "low" :
    confLevels.includes("medium") ? "medium" : "high";

  // Final decision
  let finalDecision: string;
  if (overallConfidence === "high") {
    finalDecision = `BUY ${ticker}: Strong setup — price at support, signals confirming, favorable regime, good portfolio fit.`;
  } else if (overallConfidence === "medium") {
    finalDecision = `BUY ${ticker} (reduced size): Decent setup but not all factors align. ${uncertainties[0] ?? "Proceed with caution."}`;
  } else {
    finalDecision = `PROPOSE ${ticker} for human review: Weak setup — ${uncertainties.slice(0, 2).join(". ")}. Not confident enough for auto-execution.`;
  }

  return {
    ticker,
    action: "buy",
    steps,
    finalDecision,
    uncertainties,
    overallConfidence,
  };
}

/**
 * Format reasoning chain as human-readable text.
 */
export function formatReasoning(chain: ReasoningChain): string {
  const confIcon = chain.overallConfidence === "high" ? "🟢" :
    chain.overallConfidence === "medium" ? "🟡" : "⚪";

  const lines: string[] = [
    `${confIcon} ${chain.ticker} — ${chain.finalDecision}`,
    "",
    "  Reasoning:",
  ];

  for (const step of chain.steps) {
    const stepIcon = step.confidence === "high" ? "✓" :
      step.confidence === "medium" ? "~" : "?";
    lines.push(`    ${stepIcon} ${step.step}: ${step.conclusion}`);
  }

  if (chain.uncertainties.length > 0) {
    lines.push("");
    lines.push("  What I'm NOT sure about:");
    for (const u of chain.uncertainties) {
      lines.push(`    ⚠ ${u}`);
    }
  }

  return lines.join("\n");
}
