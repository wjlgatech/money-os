/**
 * Unified Broker/Exchange Connector Interface
 *
 * Every connector — Coinbase, Kraken, Moomoo, Plaid, Alpaca — implements
 * this interface. The ConnectorManager doesn't care which broker it's
 * talking to. USB-C for money.
 */

export interface ConnectorCredentials {
  type: "api_key" | "oauth" | "plaid" | "manual";
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;    // Coinbase requires this
  oauthToken?: string;
  refreshToken?: string;
  plaidAccessToken?: string;
  plaidItemId?: string;
}

export interface Position {
  connector: string;
  account: string;
  accountType: "brokerage" | "ira" | "roth_ira" | "401k" | "crypto" | "trading" | "checking" | "savings";
  ticker: string;
  name: string;
  assetType: "stock" | "etf" | "crypto" | "bond" | "mutual_fund" | "option" | "cash";
  quantity: number;
  avgCostBasis: number | null;
  currentPrice: number | null;
  marketValue: number;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  sector: string | null;
  lastUpdated: string;
}

export interface Balance {
  connector: string;
  account: string;
  accountType: string;
  currency: string;
  available: number;
  total: number;
}

export interface Transaction {
  connector: string;
  account: string;
  date: string;
  type: "buy" | "sell" | "dividend" | "deposit" | "withdrawal" | "fee" | "interest";
  ticker: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  description: string;
}

export interface ConnectionStatus {
  connected: boolean;
  message: string;
  accountCount: number;
  lastSync: string | null;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  message: string;
}

export interface SyncResult {
  success: boolean;
  positionsCount: number;
  balancesCount: number;
  errors: string[];
  duration: number;
}

export interface BrokerConnector {
  // Identity
  id: string;
  name: string;
  type: "broker" | "exchange" | "bank" | "aggregator" | "manual";
  assetClasses: string[];
  requiresCredentials: boolean;

  // Connection
  connect(credentials: ConnectorCredentials): Promise<ConnectionStatus>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getHealth(): Promise<HealthStatus>;

  // Read
  getPositions(): Promise<Position[]>;
  getBalances(): Promise<Balance[]>;
  getTransactions?(since?: Date): Promise<Transaction[]>;

  // Sync
  getLastSync(): string | null;
  sync(): Promise<SyncResult>;
}
