/**
 * Claude Intelligence Layer
 *
 * Every piece of text the user sees on the dashboard can be
 * AI-interpreted. This module wraps the Anthropic SDK and
 * provides specialized functions for financial interpretation.
 *
 * Cost: ~$0.01-0.03 per call (Sonnet). ~$0.10 per full page load.
 */

import Anthropic from "@anthropic-ai/sdk";

// Explicitly use the key from .env.local, not system env
// (system env may have a different workspace's key)
const MONEY_OS_API_KEY = process.env.MONEY_OS_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY ?? "";
const client = new Anthropic({ apiKey: MONEY_OS_API_KEY });
const MODEL = "claude-sonnet-4-6";

// ── Core Call ────────────────────────────────────────────────

async function ask(
  system: string,
  prompt: string,
  maxTokens: number = 300
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  } catch (err) {
    console.error("Claude API error:", (err as Error).message);
    return ""; // graceful fallback — UI shows template text if AI fails
  }
}

// ── Financial Interpretation Functions ────────────────────────

/**
 * Generate the morning/evening briefing narrative.
 */
export async function generateBriefing(context: {
  positions: Array<{ symbol: string; pnlPct: number; value: number }>;
  pendingCount: number;
  watchCount: number;
  regime: string;
  vix: number;
  recentActions: string[];
  totalEquity: number;
  totalPnl: number;
}): Promise<string> {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return ask(
    `You are a financial co-pilot. Tone: warm, direct, concise. One short paragraph. Start with "${greeting}."`,
    `Generate a briefing given:
- Portfolio: $${context.totalEquity.toLocaleString()}, P&L: ${context.totalPnl >= 0 ? "+" : ""}$${context.totalPnl.toFixed(0)}
- ${context.positions.length} positions: ${context.positions.map(p => `${p.symbol} ${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(1)}%`).join(", ") || "none"}
- ${context.pendingCount} new opportunities pending review
- ${context.watchCount} stocks on watchlist approaching key levels
- Market regime: ${context.regime}, VIX: ${context.vix}
- Recent actions: ${context.recentActions.join("; ") || "none"}

Be specific about what matters. Don't be generic.`,
    200
  );
}

/**
 * Explain why a specific trade proposal matters to THIS user.
 */
export async function explainProposal(context: {
  ticker: string;
  shares: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  signals: string[];
  reason: string;
  portfolioEquity: number;
  existingPositions: string[];
  regime: string;
  vix: number;
  userLevel: "beginner" | "intermediate" | "advanced";
}): Promise<string> {
  const depth = context.userLevel === "beginner"
    ? "Use everyday analogies. No jargon. Explain like they've never invested before."
    : context.userLevel === "intermediate"
    ? "Name concepts but explain briefly. They know basics but not advanced technicals."
    : "Be direct and technical. They understand RSI, MACD, trendlines.";

  return ask(
    `You are a financial coach using ADEPT (Analogy, Diagram, Example, Plain interpretation, Technical). ${depth} Max 3 sentences.`,
    `Explain this trade proposal to the user:
- BUY ${context.shares} ${context.ticker} @ $${context.price}
- Stop: $${context.stopLoss}, Target: $${context.takeProfit}
- Signals: ${context.signals.join(", ") || "zone entry only"}
- Reason: ${context.reason}
- Their portfolio: $${context.portfolioEquity.toLocaleString()}, positions: ${context.existingPositions.join(", ") || "none"}
- Market: ${context.regime}, VIX ${context.vix}

Why should they care? What's the risk/reward in human terms? Be honest if it's weak.`,
    250
  );
}

/**
 * Explain a position's status in context.
 */
export async function explainPosition(context: {
  symbol: string;
  qty: number;
  avgEntry: number;
  currentPrice: number;
  pnlPct: number;
  daysSinceEntry: number;
  regime: string;
  userLevel: string;
}): Promise<string> {
  return ask(
    "You are a portfolio coach. One sentence. Be specific and actionable.",
    `Position: ${context.qty} ${context.symbol} @ $${context.avgEntry} → $${context.currentPrice} (${context.pnlPct >= 0 ? "+" : ""}${context.pnlPct.toFixed(1)}%, held ${context.daysSinceEntry} days). Market: ${context.regime}. What should the user know or do?`,
    100
  );
}

/**
 * Generate reasoning for an approval decision.
 */
export async function generateApprovalReasoning(context: {
  ticker: string;
  shares: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  signals: string[];
  portfolioEquity: number;
  existingPositions: string[];
  regime: string;
}): Promise<string> {
  return ask(
    "You are documenting a trade decision for an audit trail. Be factual and specific. Include: what the setup is, why it was approved, what the risks are, and when to exit.",
    `Trade approved: BUY ${context.shares} ${context.ticker} @ $${context.price}
Stop: $${context.stopLoss}, Target: $${context.takeProfit}
Signals: ${context.signals.join(", ") || "zone entry only"}
Portfolio: $${context.portfolioEquity.toLocaleString()}, existing: ${context.existingPositions.join(", ")}
Regime: ${context.regime}

Write 3-4 sentences: thesis, entry reasoning, risk, exit plan.`,
    200
  );
}

/**
 * Answer a user question with full portfolio context.
 */
export async function answerQuestion(
  question: string,
  context: {
    portfolioEquity: number;
    positions: Array<{ symbol: string; pnlPct: number }>;
    pendingApprovals: Array<{ ticker: string; reason: string }>;
    regime: string;
    vix: number;
    userLevel: string;
  }
): Promise<string> {
  return ask(
    `You are a financial co-pilot. The user is looking at their Money OS dashboard. Answer their question using the portfolio context provided. Be concise (2-4 sentences). Use ADEPT coaching if the question involves a concept they might not know.`,
    `User asks: "${question}"

Context:
- Portfolio: $${context.portfolioEquity.toLocaleString()}
- Positions: ${context.positions.map(p => `${p.symbol} ${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(1)}%`).join(", ") || "none"}
- Pending proposals: ${context.pendingApprovals.map(p => `${p.ticker}: ${p.reason}`).join("; ") || "none"}
- Market: ${context.regime}, VIX ${context.vix}
- User level: ${context.userLevel}`,
    300
  );
}

/**
 * Extract portfolio holdings from a screenshot description.
 * (Used when Claude vision processes the image — the dashboard
 * sends the image to this function for interpretation.)
 */
export async function extractPortfolioFromImage(
  imageBase64: string,
  mimeType: string = "image/png"
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as "image/png", data: imageBase64 },
          },
          {
            type: "text",
            text: `Extract all portfolio holdings from this broker screenshot. For each position, provide: ticker, quantity, average cost (if visible), current price, market value, and asset type (stock/etf/crypto/bond).

Return as a JSON array: [{"ticker": "AAPL", "qty": 50, "avgCost": 142.30, "currentPrice": 251.49, "value": 12574, "type": "stock"}]

If any value is not visible, use null. Be precise — this is financial data.`,
          },
        ],
      }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "[]";
  } catch (err) {
    console.error("Vision extraction error:", (err as Error).message);
    return "[]";
  }
}
