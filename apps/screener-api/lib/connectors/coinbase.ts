/**
 * Coinbase Connector
 *
 * Connects to Coinbase via REST API (Advanced Trade API).
 * Requires: API Key + API Secret from https://www.coinbase.com/settings/api
 *
 * Scopes needed: wallet:accounts:read, wallet:transactions:read
 */

import { createHmac } from "crypto";
import type {
  BrokerConnector, ConnectorCredentials, ConnectionStatus,
  HealthStatus, Position, Balance, Transaction, SyncResult,
} from "./interface";

export class CoinbaseConnector implements BrokerConnector {
  id = "coinbase";
  name = "Coinbase";
  type = "exchange" as const;
  assetClasses = ["crypto"];
  requiresCredentials = true;

  private apiKey = "";
  private apiSecret = "";
  private connected = false;
  private lastSyncTime: string | null = null;
  private cachedPositions: Position[] = [];
  private cachedBalances: Balance[] = [];

  async connect(credentials: ConnectorCredentials): Promise<ConnectionStatus> {
    if (!credentials.apiKey || !credentials.apiSecret) {
      return { connected: false, message: "API key and secret required", accountCount: 0, lastSync: null };
    }
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;

    try {
      // Test connection by listing accounts
      const accounts = await this.request("GET", "/v2/accounts?limit=100");
      this.connected = true;
      const count = accounts.data?.length ?? 0;
      return { connected: true, message: `Connected. ${count} wallets found.`, accountCount: count, lastSync: null };
    } catch (err) {
      return { connected: false, message: `Connection failed: ${(err as Error).message}`, accountCount: 0, lastSync: null };
    }
  }

  async disconnect(): Promise<void> {
    this.apiKey = "";
    this.apiSecret = "";
    this.connected = false;
    this.cachedPositions = [];
    this.cachedBalances = [];
  }

  isConnected(): boolean { return this.connected; }

  async getHealth(): Promise<HealthStatus> {
    if (!this.connected) return { healthy: false, latencyMs: 0, message: "Not connected" };
    const start = Date.now();
    try {
      await this.request("GET", "/v2/time");
      return { healthy: true, latencyMs: Date.now() - start, message: "OK" };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, message: (err as Error).message };
    }
  }

  async getPositions(): Promise<Position[]> {
    if (!this.connected) return [];
    const accounts = await this.request("GET", "/v2/accounts?limit=100");
    const positions: Position[] = [];
    const now = new Date().toISOString();

    for (const acc of accounts.data ?? []) {
      const balance = Number(acc.balance?.amount ?? 0);
      if (balance <= 0) continue;

      const currency = acc.balance?.currency ?? acc.currency?.code ?? "USD";
      if (currency === "USD") continue; // skip fiat

      const nativeValue = Number(acc.native_balance?.amount ?? 0);
      const avgCost = balance > 0 ? nativeValue / balance : null; // rough estimate

      positions.push({
        connector: this.id,
        account: "Coinbase",
        accountType: "crypto",
        ticker: currency,
        name: acc.currency?.name ?? currency,
        assetType: "crypto",
        quantity: balance,
        avgCostBasis: null, // Coinbase doesn't provide cost basis in this endpoint
        currentPrice: balance > 0 ? nativeValue / balance : null,
        marketValue: nativeValue,
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
    const accounts = await this.request("GET", "/v2/accounts?limit=100");
    const balances: Balance[] = [];

    for (const acc of accounts.data ?? []) {
      const amount = Number(acc.balance?.amount ?? 0);
      if (amount <= 0) continue;
      balances.push({
        connector: this.id,
        account: "Coinbase",
        accountType: "crypto",
        currency: acc.balance?.currency ?? "USD",
        available: amount,
        total: amount,
      });
    }

    this.cachedBalances = balances;
    return balances;
  }

  getLastSync(): string | null { return this.lastSyncTime; }

  async sync(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let posCount = 0;
    let balCount = 0;

    try {
      const positions = await this.getPositions();
      posCount = positions.length;
    } catch (err) { errors.push(`Positions: ${(err as Error).message}`); }

    try {
      const balances = await this.getBalances();
      balCount = balances.length;
    } catch (err) { errors.push(`Balances: ${(err as Error).message}`); }

    this.lastSyncTime = new Date().toISOString();
    return { success: errors.length === 0, positionsCount: posCount, balancesCount: balCount, errors, duration: Date.now() - start };
  }

  // ── Coinbase API Auth ──────────────────────────────────

  private async request(method: string, path: string): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + method + path;
    const signature = createHmac("sha256", this.apiSecret).update(message).digest("hex");

    const url = `https://api.coinbase.com${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        "CB-ACCESS-KEY": this.apiKey,
        "CB-ACCESS-SIGN": signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-VERSION": "2024-01-01",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Coinbase ${response.status}: ${body.slice(0, 200)}`);
    }
    return response.json();
  }
}
