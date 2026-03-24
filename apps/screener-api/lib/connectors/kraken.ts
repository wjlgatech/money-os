/**
 * Kraken Connector
 *
 * Connects to Kraken via REST API.
 * Requires: API Key + Private Key from https://www.kraken.com/u/security/api
 *
 * Permissions needed: Query Funds, Query Open Orders & Trades
 */

import { createHmac, createHash } from "crypto";
import type {
  BrokerConnector, ConnectorCredentials, ConnectionStatus,
  HealthStatus, Position, Balance, SyncResult,
} from "./interface";

// Kraken uses different ticker names internally
const KRAKEN_TICKER_MAP: Record<string, string> = {
  XXBT: "BTC", XETH: "ETH", XXRP: "XRP", XXLM: "XLM", XLTC: "LTC",
  XXDG: "DOGE", XZEC: "ZEC", XXMR: "XMR", XREP: "REP", XETC: "ETC",
  ZUSD: "USD", ZEUR: "EUR", ZGBP: "GBP", ZJPY: "JPY", ZCAD: "CAD",
  SOL: "SOL", DOT: "DOT", ADA: "ADA", AVAX: "AVAX", LINK: "LINK",
  UNI: "UNI", ATOM: "ATOM", NEAR: "NEAR", APT: "APT", ARB: "ARB",
  OP: "OP", SUI: "SUI", SEI: "SEI", MATIC: "MATIC",
};

function normalizeKrakenTicker(krakenTicker: string): string {
  return KRAKEN_TICKER_MAP[krakenTicker] ?? krakenTicker;
}

export class KrakenConnector implements BrokerConnector {
  id = "kraken";
  name = "Kraken";
  type = "exchange" as const;
  assetClasses = ["crypto"];
  requiresCredentials = true;

  private apiKey = "";
  private privateKey = "";
  private connected = false;
  private lastSyncTime: string | null = null;
  private cachedPositions: Position[] = [];

  async connect(credentials: ConnectorCredentials): Promise<ConnectionStatus> {
    if (!credentials.apiKey || !credentials.apiSecret) {
      return { connected: false, message: "API key and private key required", accountCount: 0, lastSync: null };
    }
    this.apiKey = credentials.apiKey;
    this.privateKey = credentials.apiSecret;

    try {
      const balance = await this.privateRequest("/0/private/Balance", {});
      this.connected = true;
      const assetCount = Object.keys(balance.result ?? {}).length;
      return { connected: true, message: `Connected. ${assetCount} assets found.`, accountCount: 1, lastSync: null };
    } catch (err) {
      return { connected: false, message: `Connection failed: ${(err as Error).message}`, accountCount: 0, lastSync: null };
    }
  }

  async disconnect(): Promise<void> {
    this.apiKey = "";
    this.privateKey = "";
    this.connected = false;
    this.cachedPositions = [];
  }

  isConnected(): boolean { return this.connected; }

  async getHealth(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const res = await fetch("https://api.kraken.com/0/public/Time", { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      return { healthy: !data.error?.length, latencyMs: Date.now() - start, message: "OK" };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, message: (err as Error).message };
    }
  }

  async getPositions(): Promise<Position[]> {
    if (!this.connected) return [];

    const balanceData = await this.privateRequest("/0/private/Balance", {});
    const balances = balanceData.result ?? {};

    // Get current prices for all held assets
    const tickers = Object.keys(balances)
      .map(normalizeKrakenTicker)
      .filter((t) => !["USD", "EUR", "GBP", "JPY", "CAD"].includes(t));

    let prices: Record<string, number> = {};
    if (tickers.length > 0) {
      try {
        const pairs = tickers.map((t) => `${t}USD`).join(",");
        const tickerRes = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pairs}`, { signal: AbortSignal.timeout(10_000) });
        const tickerData = await tickerRes.json();
        for (const [pair, info] of Object.entries(tickerData.result ?? {})) {
          const ticker = pair.replace(/USD$/, "").replace(/^X/, "");
          prices[normalizeKrakenTicker(ticker)] = Number((info as Record<string, string[]>).c?.[0] ?? 0);
        }
      } catch { /* price fetch failed, continue without */ }
    }

    const positions: Position[] = [];
    const now = new Date().toISOString();

    for (const [krakenTicker, amount] of Object.entries(balances)) {
      const qty = Number(amount);
      if (qty <= 0.0001) continue;

      const ticker = normalizeKrakenTicker(krakenTicker);
      if (["USD", "EUR", "GBP", "JPY", "CAD"].includes(ticker)) continue;

      const price = prices[ticker] ?? null;
      const value = price ? qty * price : 0;

      positions.push({
        connector: this.id,
        account: "Kraken",
        accountType: "crypto",
        ticker,
        name: ticker,
        assetType: "crypto",
        quantity: qty,
        avgCostBasis: null,
        currentPrice: price,
        marketValue: value,
        unrealizedPnl: null,
        unrealizedPnlPct: null,
        sector: "Crypto",
        lastUpdated: now,
      });
    }

    this.cachedPositions = positions;
    return positions;
  }

  async getBalances(): Promise<Balance[]> {
    if (!this.connected) return [];
    const balanceData = await this.privateRequest("/0/private/Balance", {});
    const balances: Balance[] = [];

    for (const [krakenTicker, amount] of Object.entries(balanceData.result ?? {})) {
      const qty = Number(amount);
      if (qty <= 0) continue;
      balances.push({
        connector: this.id,
        account: "Kraken",
        accountType: "crypto",
        currency: normalizeKrakenTicker(krakenTicker),
        available: qty,
        total: qty,
      });
    }
    return balances;
  }

  getLastSync(): string | null { return this.lastSyncTime; }

  async sync(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let posCount = 0;
    try {
      const positions = await this.getPositions();
      posCount = positions.length;
    } catch (err) { errors.push((err as Error).message); }

    this.lastSyncTime = new Date().toISOString();
    return { success: errors.length === 0, positionsCount: posCount, balancesCount: posCount, errors, duration: Date.now() - start };
  }

  // ── Kraken Private API Auth ────────────────────────────

  private async privateRequest(path: string, data: Record<string, string>): Promise<any> {
    const nonce = Date.now().toString();
    const body = new URLSearchParams({ nonce, ...data }).toString();

    // Kraken signature: HMAC-SHA512(path + SHA256(nonce + body), base64decode(secret))
    const hash = createHash("sha256").update(nonce + body).digest();
    const secret = Buffer.from(this.privateKey, "base64");
    const hmac = createHmac("sha512", secret).update(Buffer.concat([Buffer.from(path), hash])).digest("base64");

    const response = await fetch(`https://api.kraken.com${path}`, {
      method: "POST",
      headers: {
        "API-Key": this.apiKey,
        "API-Sign": hmac,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`Kraken ${response.status}`);
    const result = await response.json();
    if (result.error?.length) throw new Error(`Kraken: ${result.error.join(", ")}`);
    return result;
  }
}
