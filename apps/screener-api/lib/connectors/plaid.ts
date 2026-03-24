/**
 * Plaid Connector — Aggregator
 *
 * Connects to 12,000+ financial institutions including:
 * - Fidelity, Schwab, Vanguard, TD Ameritrade
 * - Chase, Bank of America, Wells Fargo
 * - Any institution supported by Plaid
 *
 * Requires: Plaid API keys from https://dashboard.plaid.com
 * Uses Plaid Investments product for holdings + transactions.
 *
 * Flow:
 * 1. Backend creates a Plaid Link token
 * 2. User opens Plaid Link in browser, logs into their bank
 * 3. Plaid returns an access token
 * 4. Backend uses access token to fetch holdings
 *
 * Pricing: Plaid charges per connected institution (free dev tier has 100 connections)
 */

import type {
  BrokerConnector, ConnectorCredentials, ConnectionStatus,
  HealthStatus, Position, Balance, SyncResult,
} from "./interface";

import { config } from "../config";

const PLAID_URLS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};
const PLAID_BASE = PLAID_URLS[config.plaidEnv] ?? PLAID_URLS.sandbox;

export class PlaidConnector implements BrokerConnector {
  id = "plaid";
  name = "Plaid (Fidelity, Schwab, Vanguard, etc.)";
  type = "aggregator" as const;
  assetClasses = ["stocks", "etfs", "bonds", "mutual_funds"];
  requiresCredentials = true;

  private clientId = "";
  private secret = "";
  private accessToken = "";
  private itemId = "";
  private connected = false;
  private lastSyncTime: string | null = null;
  private institutionName = "";
  private cachedPositions: Position[] = [];

  /**
   * Connect requires either:
   * 1. plaidAccessToken (already linked) — just use it
   * 2. clientId + secret — will need Plaid Link flow first
   */
  async connect(credentials: ConnectorCredentials): Promise<ConnectionStatus> {
    if (credentials.plaidAccessToken) {
      // Already linked — use existing access token
      this.accessToken = credentials.plaidAccessToken;
      this.itemId = credentials.plaidItemId ?? "";
      this.clientId = credentials.apiKey ?? "";
      this.secret = credentials.apiSecret ?? "";
      this.connected = true;
      return { connected: true, message: "Connected with existing Plaid link", accountCount: 1, lastSync: null };
    }

    if (!credentials.apiKey || !credentials.apiSecret) {
      return {
        connected: false,
        message: "Plaid client_id and secret required. Get from https://dashboard.plaid.com/developers/keys",
        accountCount: 0,
        lastSync: null,
      };
    }

    this.clientId = credentials.apiKey;
    this.secret = credentials.apiSecret;

    return {
      connected: false,
      message: "Plaid credentials saved. Next step: create a Link token and have the user complete Plaid Link in the browser to connect their bank.",
      accountCount: 0,
      lastSync: null,
    };
  }

  async disconnect(): Promise<void> {
    this.accessToken = "";
    this.itemId = "";
    this.connected = false;
    this.cachedPositions = [];
  }

  isConnected(): boolean { return this.connected; }

  async getHealth(): Promise<HealthStatus> {
    if (!this.connected) return { healthy: false, latencyMs: 0, message: "Not connected — complete Plaid Link flow first" };
    const start = Date.now();
    try {
      await this.plaidRequest("/item/get", { access_token: this.accessToken });
      return { healthy: true, latencyMs: Date.now() - start, message: "OK" };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, message: (err as Error).message };
    }
  }

  // ── Create Link Token (step 1 of Plaid Link flow) ─────

  async createLinkToken(userId: string): Promise<{ linkToken: string; expiration: string }> {
    const response = await this.plaidRequest("/link/token/create", {
      client_id: this.clientId,
      secret: this.secret,
      user: { client_user_id: userId },
      client_name: "Money OS",
      products: ["investments"],
      country_codes: ["US"],
      language: "en",
    });

    return {
      linkToken: response.link_token,
      expiration: response.expiration,
    };
  }

  // ── Exchange public token for access token (step 2) ────

  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    const response = await this.plaidRequest("/item/public_token/exchange", {
      client_id: this.clientId,
      secret: this.secret,
      public_token: publicToken,
    });

    this.accessToken = response.access_token;
    this.itemId = response.item_id;
    this.connected = true;

    return {
      accessToken: this.accessToken,
      itemId: this.itemId,
    };
  }

  // ── Read Holdings ──────────────────────────────────────

  async getPositions(): Promise<Position[]> {
    if (!this.connected) return [];

    const response = await this.plaidRequest("/investments/holdings/get", {
      client_id: this.clientId,
      secret: this.secret,
      access_token: this.accessToken,
    });

    const accounts = response.accounts ?? [];
    const holdings = response.holdings ?? [];
    const securities = response.securities ?? [];
    const now = new Date().toISOString();

    // Build security lookup
    const securityMap = new Map<string, Record<string, unknown>>();
    for (const sec of securities) {
      securityMap.set(sec.security_id, sec);
    }

    // Build account lookup
    const accountMap = new Map<string, Record<string, unknown>>();
    for (const acc of accounts) {
      accountMap.set(acc.account_id, acc);
    }

    const positions: Position[] = [];

    for (const holding of holdings) {
      const security = securityMap.get(holding.security_id);
      if (!security) continue;

      const account = accountMap.get(holding.account_id);
      const ticker = (security.ticker_symbol as string) ?? "UNKNOWN";
      const qty = Number(holding.quantity ?? 0);
      if (qty <= 0 && ticker !== "CUR:USD") continue;

      const currentPrice = Number(holding.institution_price ?? security.close_price ?? 0);
      const costBasis = Number(holding.cost_basis ?? 0);
      const marketValue = Number(holding.institution_value ?? currentPrice * qty);

      // Determine asset type
      let assetType: Position["assetType"] = "stock";
      const secType = security.type as string;
      if (secType === "etf") assetType = "etf";
      else if (secType === "mutual fund") assetType = "mutual_fund";
      else if (secType === "fixed income") assetType = "bond";
      else if (secType === "cash") assetType = "cash";
      else if (secType === "cryptocurrency") assetType = "crypto";

      // Determine account type
      let accountType: Position["accountType"] = "brokerage";
      const accType = (account?.type as string)?.toLowerCase() ?? "";
      const accSubtype = (account?.subtype as string)?.toLowerCase() ?? "";
      if (accSubtype.includes("ira") && accSubtype.includes("roth")) accountType = "roth_ira";
      else if (accSubtype.includes("ira")) accountType = "ira";
      else if (accSubtype.includes("401")) accountType = "401k";

      positions.push({
        connector: this.id,
        account: (account?.name as string) ?? `Plaid (${this.institutionName})`,
        accountType,
        ticker,
        name: (security.name as string) ?? ticker,
        assetType,
        quantity: qty,
        avgCostBasis: costBasis > 0 ? costBasis / qty : null,
        currentPrice: currentPrice || null,
        marketValue,
        unrealizedPnl: costBasis > 0 ? marketValue - costBasis : null,
        unrealizedPnlPct: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : null,
        sector: null,
        lastUpdated: now,
      });
    }

    this.cachedPositions = positions;
    return positions;
  }

  async getBalances(): Promise<Balance[]> {
    if (!this.connected) return [];

    const response = await this.plaidRequest("/accounts/balance/get", {
      client_id: this.clientId,
      secret: this.secret,
      access_token: this.accessToken,
    });

    const balances: Balance[] = [];
    for (const acc of response.accounts ?? []) {
      balances.push({
        connector: this.id,
        account: acc.name ?? "Plaid Account",
        accountType: acc.subtype ?? acc.type ?? "unknown",
        currency: "USD",
        available: Number(acc.balances?.available ?? 0),
        total: Number(acc.balances?.current ?? 0),
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
    catch (err) { errors.push(`Holdings: ${(err as Error).message}`); }

    try { balCount = (await this.getBalances()).length; }
    catch (err) { errors.push(`Balances: ${(err as Error).message}`); }

    this.lastSyncTime = new Date().toISOString();
    return { success: errors.length === 0, positionsCount: posCount, balancesCount: balCount, errors, duration: Date.now() - start };
  }

  // ── Plaid API ──────────────────────────────────────────

  private async plaidRequest(path: string, body: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${PLAID_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Plaid ${response.status}: ${(error as Record<string, string>).error_message ?? "Unknown error"}`);
    }
    return response.json();
  }
}
