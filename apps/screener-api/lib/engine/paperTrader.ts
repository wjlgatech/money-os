/**
 * Paper Trading Engine
 *
 * Maintains a virtual portfolio, executes trades against real market prices,
 * tracks P&L, and generates reports. All state persisted to database.
 */

// ── Types ────────────────────────────────────────────────────

export interface PaperPortfolio {
  id: string;
  name: string;
  initialCapital: number;
  cash: number;
  positions: PaperPosition[];
  closedTrades: PaperTrade[];
  createdAt: string;
  updatedAt: string;
}

export interface PaperPosition {
  ticker: string;
  shares: number;
  avgEntryPrice: number;
  entryDate: string;
  stopLoss: number | null;
  takeProfit: number | null;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  signals: string[];
}

export interface PaperTrade {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  date: string;
  reason: string;
  pnl: number | null;
  pnlPct: number | null;
}

export interface TradeProposal {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  estimatedPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  reason: string;
  signals: string[];
  riskAmount: number;       // max $ at risk (shares × (entry - stop))
  riskPct: number;          // risk as % of portfolio
  confidence: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "executed" | "expired";
  createdAt: string;
  expiresAt: string;        // proposals expire after market open
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  cash: number;
  positionsValue: number;
  openPositions: number;
  dayPnl: number;
  dayPnlPct: number;
  totalPnl: number;
  totalPnlPct: number;
}

// ── Paper Trader ─────────────────────────────────────────────

export class PaperTrader {
  private portfolio: PaperPortfolio;

  constructor(portfolio?: PaperPortfolio) {
    this.portfolio = portfolio ?? {
      id: crypto.randomUUID(),
      name: "Paper Portfolio",
      initialCapital: 100_000,
      cash: 100_000,
      positions: [],
      closedTrades: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Portfolio State ──────────────────────────────────────

  getPortfolio(): PaperPortfolio {
    return { ...this.portfolio };
  }

  getSnapshot(currentPrices: Record<string, number>): PortfolioSnapshot {
    let positionsValue = 0;
    for (const pos of this.portfolio.positions) {
      const price = currentPrices[pos.ticker] ?? pos.currentPrice;
      pos.currentPrice = price;
      pos.unrealizedPnl = (price - pos.avgEntryPrice) * pos.shares;
      pos.unrealizedPnlPct = (price - pos.avgEntryPrice) / pos.avgEntryPrice;
      positionsValue += price * pos.shares;
    }

    const totalValue = this.portfolio.cash + positionsValue;
    const totalPnl = totalValue - this.portfolio.initialCapital;

    return {
      date: new Date().toISOString().slice(0, 10),
      totalValue: Number(totalValue.toFixed(2)),
      cash: Number(this.portfolio.cash.toFixed(2)),
      positionsValue: Number(positionsValue.toFixed(2)),
      openPositions: this.portfolio.positions.length,
      dayPnl: 0, // would need previous snapshot to compute
      dayPnlPct: 0,
      totalPnl: Number(totalPnl.toFixed(2)),
      totalPnlPct: Number(((totalPnl / this.portfolio.initialCapital) * 100).toFixed(2)),
    };
  }

  // ── Trade Execution ──────────────────────────────────────

  executeBuy(
    ticker: string,
    shares: number,
    price: number,
    reason: string,
    stopLoss: number | null = null,
    takeProfit: number | null = null,
    signals: string[] = []
  ): PaperTrade {
    const cost = shares * price;
    if (cost > this.portfolio.cash) {
      throw new Error(
        `Insufficient cash: need $${cost.toFixed(2)}, have $${this.portfolio.cash.toFixed(2)}`
      );
    }

    this.portfolio.cash -= cost;

    // Check if we already have a position in this ticker
    const existing = this.portfolio.positions.find((p) => p.ticker === ticker);
    if (existing) {
      // Average up/down
      const totalShares = existing.shares + shares;
      existing.avgEntryPrice =
        (existing.avgEntryPrice * existing.shares + price * shares) / totalShares;
      existing.shares = totalShares;
      if (stopLoss) existing.stopLoss = stopLoss;
      if (takeProfit) existing.takeProfit = takeProfit;
    } else {
      this.portfolio.positions.push({
        ticker,
        shares,
        avgEntryPrice: price,
        entryDate: new Date().toISOString().slice(0, 10),
        stopLoss,
        takeProfit,
        currentPrice: price,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        signals,
      });
    }

    const trade: PaperTrade = {
      id: crypto.randomUUID(),
      ticker,
      side: "buy",
      shares,
      price,
      date: new Date().toISOString().slice(0, 10),
      reason,
      pnl: null,
      pnlPct: null,
    };

    this.portfolio.closedTrades.push(trade);
    this.portfolio.updatedAt = new Date().toISOString();
    return trade;
  }

  executeSell(
    ticker: string,
    shares: number,
    price: number,
    reason: string
  ): PaperTrade {
    const pos = this.portfolio.positions.find((p) => p.ticker === ticker);
    if (!pos) throw new Error(`No position in ${ticker}`);
    if (shares > pos.shares) throw new Error(`Only ${pos.shares} shares available`);

    const proceeds = shares * price;
    const pnl = (price - pos.avgEntryPrice) * shares;
    const pnlPct = (price - pos.avgEntryPrice) / pos.avgEntryPrice;

    this.portfolio.cash += proceeds;

    if (shares === pos.shares) {
      // Close entire position
      this.portfolio.positions = this.portfolio.positions.filter(
        (p) => p.ticker !== ticker
      );
    } else {
      pos.shares -= shares;
    }

    const trade: PaperTrade = {
      id: crypto.randomUUID(),
      ticker,
      side: "sell",
      shares,
      price,
      date: new Date().toISOString().slice(0, 10),
      reason,
      pnl: Number(pnl.toFixed(2)),
      pnlPct: Number((pnlPct * 100).toFixed(2)),
    };

    this.portfolio.closedTrades.push(trade);
    this.portfolio.updatedAt = new Date().toISOString();
    return trade;
  }

  // ── Trade Proposals ──────────────────────────────────────

  createProposal(
    ticker: string,
    side: "buy" | "sell",
    shares: number,
    estimatedPrice: number,
    reason: string,
    signals: string[] = [],
    stopLoss: number | null = null,
    takeProfit: number | null = null
  ): TradeProposal {
    const totalValue = this.portfolio.cash +
      this.portfolio.positions.reduce((s, p) => s + p.currentPrice * p.shares, 0);

    const riskAmount = stopLoss
      ? shares * Math.abs(estimatedPrice - stopLoss)
      : shares * estimatedPrice * 0.05; // assume 5% risk if no stop

    const riskPct = (riskAmount / totalValue) * 100;

    // Confidence based on number of confirming signals
    let confidence: "low" | "medium" | "high" = "low";
    if (signals.length >= 3) confidence = "high";
    else if (signals.length >= 2) confidence = "medium";

    // Expires at next market open + 30 min
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 30, 0, 0);

    return {
      id: crypto.randomUUID(),
      ticker,
      side,
      shares,
      estimatedPrice,
      stopLoss,
      takeProfit,
      reason,
      signals,
      riskAmount: Number(riskAmount.toFixed(2)),
      riskPct: Number(riskPct.toFixed(2)),
      confidence,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: tomorrow.toISOString(),
    };
  }

  // ── Stop Loss / Take Profit Check ────────────────────────

  checkExits(currentPrices: Record<string, number>): PaperTrade[] {
    const trades: PaperTrade[] = [];

    for (const pos of [...this.portfolio.positions]) {
      const price = currentPrices[pos.ticker];
      if (!price) continue;

      // Stop loss
      if (pos.stopLoss && price <= pos.stopLoss) {
        trades.push(
          this.executeSell(pos.ticker, pos.shares, price, "stop_loss")
        );
        continue;
      }

      // Take profit
      if (pos.takeProfit && price >= pos.takeProfit) {
        trades.push(
          this.executeSell(pos.ticker, pos.shares, price, "take_profit")
        );
      }
    }

    return trades;
  }

  // ── Serialization ────────────────────────────────────────

  toJSON(): string {
    return JSON.stringify(this.portfolio, null, 2);
  }

  static fromJSON(json: string): PaperTrader {
    const portfolio = JSON.parse(json) as PaperPortfolio;
    return new PaperTrader(portfolio);
  }
}
