/**
 * Alpaca Broker Adapter
 *
 * Handles order execution, position management, and account info
 * via Alpaca's Trading API. Works identically for paper and live —
 * the only difference is the base URL.
 *
 * Paper: https://paper-api.alpaca.markets
 * Live:  https://api.alpaca.markets
 */

import { config } from "../config";

// ── Types ────────────────────────────────────────────────────

export interface AlpacaAccount {
  id: string;
  status: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  equity: string;
  last_equity: string;
  long_market_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  status: string;        // 'new' | 'accepted' | 'filled' | 'partially_filled' | 'canceled' | 'rejected'
  symbol: string;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  side: "buy" | "sell";
  type: string;          // 'market' | 'limit' | 'stop' | 'stop_limit'
  time_in_force: string;
  submitted_at: string;
  filled_at: string | null;
  created_at: string;
}

export interface OrderRequest {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  time_in_force: "day" | "gtc" | "ioc";
  limit_price?: number;
  stop_price?: number;
}

// ── Validation ───────────────────────────────────────────────

const SYMBOL_PATTERN = /^[A-Z0-9./-]{1,20}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/;

function validateSymbol(symbol: string): string {
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error(`Invalid symbol: "${symbol}" — must be 1-20 uppercase alphanumeric chars`);
  }
  return encodeURIComponent(symbol);
}

function validateOrderId(id: string): string {
  if (!UUID_PATTERN.test(id)) {
    throw new Error(`Invalid order ID: "${id}" — must be UUID format`);
  }
  return id;
}

function validateQty(qty: number): void {
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
    throw new Error(`Invalid quantity: ${qty} — must be a positive integer`);
  }
}

function validatePrice(price: number): void {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price: ${price} — must be a positive number`);
  }
}

// ── Client ───────────────────────────────────────────────────

export class AlpacaBroker {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(
    apiKey?: string,
    apiSecret?: string,
    paper: boolean = true
  ) {
    const key = apiKey ?? config.alpacaTradingKey;
    const secret = apiSecret ?? config.alpacaTradingSecret;

    if (!key || !secret) {
      throw new Error("Alpaca API key and secret are required");
    }

    this.baseUrl = paper
      ? "https://paper-api.alpaca.markets"
      : "https://api.alpaca.markets";

    this.headers = {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
      "Content-Type": "application/json",
    };
  }

  // ── Account ────────────────────────────────────────────

  async getAccount(): Promise<AlpacaAccount> {
    return this.request("GET", "/v2/account");
  }

  // ── Positions ──────────────────────────────────────────

  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request("GET", "/v2/positions");
  }

  async getPosition(symbol: string): Promise<AlpacaPosition> {
    return this.request("GET", `/v2/positions/${validateSymbol(symbol)}`);
  }

  async closePosition(symbol: string): Promise<AlpacaOrder> {
    return this.request("DELETE", `/v2/positions/${validateSymbol(symbol)}`);
  }

  async closeAllPositions(): Promise<{ statuses: Array<{ symbol: string; status: number }> }> {
    return this.request("DELETE", "/v2/positions");
  }

  // ── Orders ─────────────────────────────────────────────

  async submitOrder(order: OrderRequest): Promise<AlpacaOrder> {
    validateSymbol(order.symbol);
    validateQty(order.qty);
    if (order.limit_price) validatePrice(order.limit_price);
    if (order.stop_price) validatePrice(order.stop_price);
    return this.request("POST", "/v2/orders", order);
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    return this.request("GET", `/v2/orders/${validateOrderId(orderId)}`);
  }

  async getOrders(status: "open" | "closed" | "all" = "open", limit: number = 50): Promise<AlpacaOrder[]> {
    return this.request("GET", `/v2/orders?status=${status}&limit=${limit}`);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request("DELETE", `/v2/orders/${validateOrderId(orderId)}`);
  }

  async cancelAllOrders(): Promise<void> {
    await this.request("DELETE", "/v2/orders");
  }

  // ── Convenience Methods ────────────────────────────────

  /**
   * Buy shares at market price. Simplest execution.
   */
  async buyMarket(symbol: string, qty: number): Promise<AlpacaOrder> {
    return this.submitOrder({
      symbol,
      qty,
      side: "buy",
      type: "market",
      time_in_force: "day",
    });
  }

  /**
   * Sell shares at market price.
   */
  async sellMarket(symbol: string, qty: number): Promise<AlpacaOrder> {
    return this.submitOrder({
      symbol,
      qty,
      side: "sell",
      type: "market",
      time_in_force: "day",
    });
  }

  /**
   * Buy with a limit price. Order stays open for the day.
   */
  async buyLimit(symbol: string, qty: number, limitPrice: number): Promise<AlpacaOrder> {
    return this.submitOrder({
      symbol,
      qty,
      side: "buy",
      type: "limit",
      time_in_force: "day",
      limit_price: limitPrice,
    });
  }

  /**
   * Place a bracket order: buy at market, with stop-loss and take-profit.
   * Alpaca handles the exit orders automatically.
   */
  async buyBracket(
    symbol: string,
    qty: number,
    stopLoss: number,
    takeProfit: number
  ): Promise<AlpacaOrder> {
    validateSymbol(symbol);
    validateQty(qty);
    validatePrice(stopLoss);
    validatePrice(takeProfit);
    return this.request("POST", "/v2/orders", {
      symbol,
      qty: String(qty),
      side: "buy",
      type: "market",
      time_in_force: "day",
      order_class: "bracket",
      stop_loss: { stop_price: String(stopLoss.toFixed(2)) },
      take_profit: { limit_price: String(takeProfit.toFixed(2)) },
    });
  }

  // ── Portfolio Snapshot ─────────────────────────────────

  async getSnapshot(): Promise<{
    equity: number;
    cash: number;
    buyingPower: number;
    positions: Array<{
      symbol: string;
      qty: number;
      avgEntry: number;
      currentPrice: number;
      marketValue: number;
      unrealizedPnl: number;
      unrealizedPnlPct: number;
    }>;
  }> {
    const [account, positions] = await Promise.all([
      this.getAccount(),
      this.getPositions(),
    ]);

    return {
      equity: Number(account.equity),
      cash: Number(account.cash),
      buyingPower: Number(account.buying_power),
      positions: positions.map((p) => ({
        symbol: p.symbol,
        qty: Number(p.qty),
        avgEntry: Number(p.avg_entry_price),
        currentPrice: Number(p.current_price),
        marketValue: Number(p.market_value),
        unrealizedPnl: Number(p.unrealized_pl),
        unrealizedPnlPct: Number(p.unrealized_plpc) * 100,
      })),
    };
  }

  // ── HTTP ───────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      // Parse Alpaca error for structured handling
      let alpacaCode = "unknown";
      try {
        const parsed = JSON.parse(errorBody);
        alpacaCode = parsed.code ?? parsed.message ?? "unknown";
      } catch { /* raw text error */ }
      throw new Error(`Alpaca ${method} ${path} failed (${response.status}, code: ${alpacaCode}): ${errorBody}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }
}
