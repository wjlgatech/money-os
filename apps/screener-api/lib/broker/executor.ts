/**
 * Trade Executor
 *
 * The bridge between trade proposals and actual execution.
 * Supports two backends:
 *   1. Paper (local JSON) — for testing without a broker
 *   2. Alpaca — for real broker execution (paper or live)
 *
 * Flow:
 *   Trade Gate (approved proposals) → Executor → Backend (paper or Alpaca)
 */

import { config } from "../config";
import { AlpacaBroker, type AlpacaOrder } from "./alpaca";
import { PaperTrader } from "../engine/paperTrader";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PAPER_PATH = path.join(process.cwd(), "data", "paper-portfolio.json");

export type ExecutionBackend = "paper" | "alpaca";

export interface ExecutionResult {
  success: boolean;
  backend: ExecutionBackend;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  requestedPrice: number;
  filledPrice: number | null;
  orderId: string | null;
  message: string;
  timestamp: string;
}

export class TradeExecutor {
  private backend: ExecutionBackend;
  private alpaca: AlpacaBroker | null = null;

  constructor(backend?: ExecutionBackend) {
    // Auto-detect: use Alpaca if keys are configured, otherwise paper
    if (backend) {
      this.backend = backend;
    } else {
      this.backend = config.hasAlpacaTrading ? "alpaca" : "paper";
    }

    if (this.backend === "alpaca") {
      this.alpaca = new AlpacaBroker(
        config.alpacaTradingKey,
        config.alpacaTradingSecret,
        config.alpacaPaperMode
      );
    }
  }

  getBackend(): ExecutionBackend {
    return this.backend;
  }

  // ── Execute a Trade ────────────────────────────────────

  async executeBuy(
    ticker: string,
    shares: number,
    estimatedPrice: number,
    stopLoss: number | null,
    takeProfit: number | null,
    reason: string,
    signals: string[] = []
  ): Promise<ExecutionResult> {
    const timestamp = new Date().toISOString();

    if (this.backend === "alpaca" && this.alpaca) {
      return this.executeAlpacaBuy(
        ticker, shares, estimatedPrice, stopLoss, takeProfit, reason, timestamp
      );
    }

    return this.executePaperBuy(
      ticker, shares, estimatedPrice, stopLoss, takeProfit, reason, signals, timestamp
    );
  }

  async executeSell(
    ticker: string,
    shares: number,
    estimatedPrice: number,
    reason: string
  ): Promise<ExecutionResult> {
    const timestamp = new Date().toISOString();

    if (this.backend === "alpaca" && this.alpaca) {
      return this.executeAlpacaSell(ticker, shares, estimatedPrice, reason, timestamp);
    }

    return this.executePaperSell(ticker, shares, estimatedPrice, reason, timestamp);
  }

  // ── Portfolio Snapshot ─────────────────────────────────

  async getPortfolio(): Promise<{
    backend: ExecutionBackend;
    equity: number;
    cash: number;
    positions: Array<{
      symbol: string;
      qty: number;
      avgEntry: number;
      currentPrice: number;
      unrealizedPnl: number;
    }>;
  }> {
    if (this.backend === "alpaca" && this.alpaca) {
      const snap = await this.alpaca.getSnapshot();
      return {
        backend: "alpaca",
        equity: snap.equity,
        cash: snap.cash,
        positions: snap.positions.map((p) => ({
          symbol: p.symbol,
          qty: p.qty,
          avgEntry: p.avgEntry,
          currentPrice: p.currentPrice,
          unrealizedPnl: p.unrealizedPnl,
        })),
      };
    }

    // Paper
    const trader = await this.loadPaperTrader();
    const portfolio = trader.getPortfolio();
    return {
      backend: "paper",
      equity: portfolio.cash + portfolio.positions.reduce(
        (s, p) => s + p.currentPrice * p.shares, 0
      ),
      cash: portfolio.cash,
      positions: portfolio.positions.map((p) => ({
        symbol: p.ticker,
        qty: p.shares,
        avgEntry: p.avgEntryPrice,
        currentPrice: p.currentPrice,
        unrealizedPnl: p.unrealizedPnl,
      })),
    };
  }

  // ── Alpaca Execution ───────────────────────────────────

  private async executeAlpacaBuy(
    ticker: string,
    shares: number,
    estimatedPrice: number,
    stopLoss: number | null,
    takeProfit: number | null,
    reason: string,
    timestamp: string
  ): Promise<ExecutionResult> {
    try {
      let order: AlpacaOrder;

      if (stopLoss && takeProfit) {
        // Bracket order: entry + stop-loss + take-profit in one
        order = await this.alpaca!.buyBracket(ticker, shares, stopLoss, takeProfit);
      } else {
        order = await this.alpaca!.buyMarket(ticker, shares);
      }

      return {
        success: true,
        backend: "alpaca",
        ticker,
        side: "buy",
        shares,
        requestedPrice: estimatedPrice,
        filledPrice: order.filled_avg_price ? Number(order.filled_avg_price) : null,
        orderId: order.id,
        message: `Alpaca order ${order.id}: ${order.status}. ${reason}`,
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        backend: "alpaca",
        ticker,
        side: "buy",
        shares,
        requestedPrice: estimatedPrice,
        filledPrice: null,
        orderId: null,
        message: `Alpaca buy failed: ${(err as Error).message}`,
        timestamp,
      };
    }
  }

  private async executeAlpacaSell(
    ticker: string,
    shares: number,
    estimatedPrice: number,
    reason: string,
    timestamp: string
  ): Promise<ExecutionResult> {
    try {
      const order = await this.alpaca!.sellMarket(ticker, shares);
      return {
        success: true,
        backend: "alpaca",
        ticker,
        side: "sell",
        shares,
        requestedPrice: estimatedPrice,
        filledPrice: order.filled_avg_price ? Number(order.filled_avg_price) : null,
        orderId: order.id,
        message: `Alpaca sell ${order.id}: ${order.status}. ${reason}`,
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        backend: "alpaca",
        ticker,
        side: "sell",
        shares,
        requestedPrice: estimatedPrice,
        filledPrice: null,
        orderId: null,
        message: `Alpaca sell failed: ${(err as Error).message}`,
        timestamp,
      };
    }
  }

  // ── Paper Execution ────────────────────────────────────

  private async executePaperBuy(
    ticker: string,
    shares: number,
    price: number,
    stopLoss: number | null,
    takeProfit: number | null,
    reason: string,
    signals: string[],
    timestamp: string
  ): Promise<ExecutionResult> {
    try {
      const trader = await this.loadPaperTrader();
      trader.executeBuy(ticker, shares, price, reason, stopLoss, takeProfit, signals);
      await this.savePaperTrader(trader);

      return {
        success: true,
        backend: "paper",
        ticker,
        side: "buy",
        shares,
        requestedPrice: price,
        filledPrice: price,
        orderId: `paper-${Date.now()}`,
        message: `Paper buy: ${shares} ${ticker} @ $${price}. ${reason}`,
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        backend: "paper",
        ticker,
        side: "buy",
        shares,
        requestedPrice: price,
        filledPrice: null,
        orderId: null,
        message: `Paper buy failed: ${(err as Error).message}`,
        timestamp,
      };
    }
  }

  private async executePaperSell(
    ticker: string,
    shares: number,
    price: number,
    reason: string,
    timestamp: string
  ): Promise<ExecutionResult> {
    try {
      const trader = await this.loadPaperTrader();
      trader.executeSell(ticker, shares, price, reason);
      await this.savePaperTrader(trader);

      return {
        success: true,
        backend: "paper",
        ticker,
        side: "sell",
        shares,
        requestedPrice: price,
        filledPrice: price,
        orderId: `paper-${Date.now()}`,
        message: `Paper sell: ${shares} ${ticker} @ $${price}. ${reason}`,
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        backend: "paper",
        ticker,
        side: "sell",
        shares,
        requestedPrice: price,
        filledPrice: null,
        orderId: null,
        message: `Paper sell failed: ${(err as Error).message}`,
        timestamp,
      };
    }
  }

  private async loadPaperTrader(): Promise<PaperTrader> {
    try {
      const json = await readFile(PAPER_PATH, "utf8");
      return PaperTrader.fromJSON(json);
    } catch {
      return new PaperTrader();
    }
  }

  private async savePaperTrader(trader: PaperTrader): Promise<void> {
    const dir = path.dirname(PAPER_PATH);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(PAPER_PATH, trader.toJSON());
  }
}
