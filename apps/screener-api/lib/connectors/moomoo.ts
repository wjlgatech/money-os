/**
 * Moomoo (Futu) Connector
 *
 * Connects to Moomoo via their OpenAPI.
 * Requires: OpenAPI key from Moomoo app settings.
 *
 * Moomoo supports: US stocks, HK stocks, CN stocks, ETFs, options.
 * Paper trading + live trading.
 *
 * API docs: https://openapi.moomoo.com/
 * Note: Moomoo OpenAPI requires a running FutuOpenD gateway locally
 * or their cloud API (newer).
 */

import type {
  BrokerConnector, ConnectorCredentials, ConnectionStatus,
  HealthStatus, Position, Balance, SyncResult,
} from "./interface";

export class MoomooConnector implements BrokerConnector {
  id = "moomoo";
  name = "Moomoo";
  type = "broker" as const;
  assetClasses = ["stocks", "etfs", "options"];
  requiresCredentials = true;

  private apiKey = "";
  private apiSecret = "";
  private baseUrl = "https://openapi.moomoo.com"; // cloud API
  private connected = false;
  private lastSyncTime: string | null = null;
  private cachedPositions: Position[] = [];
  private accountId = "";

  async connect(credentials: ConnectorCredentials): Promise<ConnectionStatus> {
    if (!credentials.apiKey || !credentials.apiSecret) {
      return { connected: false, message: "Moomoo API key and secret required. Get from Moomoo app → Settings → API.", accountCount: 0, lastSync: null };
    }
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;

    try {
      // Get account list
      const accounts = await this.request("GET", "/v1/accounts");
      if (accounts.data?.length > 0) {
        this.accountId = accounts.data[0].account_id;
        this.connected = true;
        return {
          connected: true,
          message: `Connected. Account: ${this.accountId}`,
          accountCount: accounts.data.length,
          lastSync: null,
        };
      }
      return { connected: false, message: "No accounts found", accountCount: 0, lastSync: null };
    } catch (err) {
      return { connected: false, message: `Connection failed: ${(err as Error).message}`, accountCount: 0, lastSync: null };
    }
  }

  async disconnect(): Promise<void> {
    this.apiKey = "";
    this.apiSecret = "";
    this.connected = false;
    this.cachedPositions = [];
    this.accountId = "";
  }

  isConnected(): boolean { return this.connected; }

  async getHealth(): Promise<HealthStatus> {
    if (!this.connected) return { healthy: false, latencyMs: 0, message: "Not connected" };
    const start = Date.now();
    try {
      await this.request("GET", "/v1/accounts");
      return { healthy: true, latencyMs: Date.now() - start, message: "OK" };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, message: (err as Error).message };
    }
  }

  async getPositions(): Promise<Position[]> {
    if (!this.connected) return [];

    const data = await this.request("GET", `/v1/accounts/${this.accountId}/positions`);
    const positions: Position[] = [];
    const now = new Date().toISOString();

    for (const pos of data.data ?? []) {
      const ticker = pos.symbol ?? pos.code ?? "";
      const qty = Number(pos.quantity ?? pos.position ?? 0);
      if (qty <= 0) continue;

      const avgCost = Number(pos.average_cost ?? pos.cost_price ?? 0);
      const currentPrice = Number(pos.current_price ?? pos.market_price ?? 0);
      const marketValue = Number(pos.market_value ?? currentPrice * qty);
      const unrealizedPnl = Number(pos.unrealized_pnl ?? (currentPrice - avgCost) * qty);

      positions.push({
        connector: this.id,
        account: `Moomoo (${this.accountId})`,
        accountType: "trading",
        ticker: ticker.replace(".US", ""), // Moomoo uses "AAPL.US" format
        name: pos.name ?? ticker,
        assetType: pos.security_type === "ETF" ? "etf" : "stock",
        quantity: qty,
        avgCostBasis: avgCost || null,
        currentPrice: currentPrice || null,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct: avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : null,
        sector: null,
        lastUpdated: now,
      });
    }

    this.cachedPositions = positions;
    return positions;
  }

  async getBalances(): Promise<Balance[]> {
    if (!this.connected) return [];

    const data = await this.request("GET", `/v1/accounts/${this.accountId}/balances`);
    const balances: Balance[] = [];

    for (const bal of data.data ?? [data.data]) {
      balances.push({
        connector: this.id,
        account: `Moomoo (${this.accountId})`,
        accountType: "trading",
        currency: bal.currency ?? "USD",
        available: Number(bal.available_cash ?? bal.cash ?? 0),
        total: Number(bal.total_assets ?? bal.net_asset ?? 0),
      });
    }
    return balances;
  }

  getLastSync(): string | null { return this.lastSyncTime; }

  async sync(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let posCount = 0;
    let balCount = 0;

    try { posCount = (await this.getPositions()).length; }
    catch (err) { errors.push(`Positions: ${(err as Error).message}`); }

    try { balCount = (await this.getBalances()).length; }
    catch (err) { errors.push(`Balances: ${(err as Error).message}`); }

    this.lastSyncTime = new Date().toISOString();
    return { success: errors.length === 0, positionsCount: posCount, balancesCount: balCount, errors, duration: Date.now() - start };
  }

  private async request(method: string, path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Moomoo ${response.status}: ${body.slice(0, 200)}`);
    }
    return response.json();
  }
}
