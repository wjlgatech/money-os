/**
 * Connector Manager
 *
 * Discovers, loads, manages, and syncs all broker/exchange connectors.
 * Provides a unified view of the user's entire financial picture.
 */

import type {
  BrokerConnector, ConnectorCredentials, Position, Balance,
  ConnectionStatus, SyncResult,
} from "./interface";
import { CoinbaseConnector } from "./coinbase";
import { KrakenConnector } from "./kraken";
import { MoomooConnector } from "./moomoo";
import { PlaidConnector } from "./plaid";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CONNECTORS_STATE_PATH = path.join(process.cwd(), "data", "connectors-state.json");

interface ConnectorState {
  credentials: Record<string, ConnectorCredentials>;
  lastSync: Record<string, string>;
  enabled: string[];
}

export interface PortfolioSummary {
  totalEquity: number;
  totalCash: number;
  accounts: Array<{
    name: string;
    connector: string;
    type: string;
    equity: number;
    positionCount: number;
  }>;
  positions: Position[];
  allocation: {
    stocks: number;
    etfs: number;
    crypto: number;
    bonds: number;
    mutualFunds: number;
    cash: number;
  };
  sectorExposure: Record<string, number>;
  connectorStatus: Array<{
    id: string;
    name: string;
    connected: boolean;
    lastSync: string | null;
    positionCount: number;
  }>;
}

export class ConnectorManager {
  private connectors = new Map<string, BrokerConnector>();
  private state: ConnectorState;

  constructor() {
    this.state = { credentials: {}, lastSync: {}, enabled: [] };

    // Register all available connectors
    this.register(new CoinbaseConnector());
    this.register(new KrakenConnector());
    this.register(new MoomooConnector());
    this.register(new PlaidConnector());
  }

  private register(connector: BrokerConnector) {
    this.connectors.set(connector.id, connector);
  }

  // ── Available Connectors ───────────────────────────────

  listAvailable(): Array<{ id: string; name: string; type: string; assetClasses: string[]; connected: boolean }> {
    return [...this.connectors.values()].map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      assetClasses: c.assetClasses,
      connected: c.isConnected(),
    }));
  }

  // ── Connect / Disconnect ───────────────────────────────

  async connectBroker(id: string, credentials: ConnectorCredentials): Promise<ConnectionStatus> {
    const connector = this.connectors.get(id);
    if (!connector) return { connected: false, message: `Unknown connector: ${id}`, accountCount: 0, lastSync: null };

    const status = await connector.connect(credentials);
    if (status.connected) {
      this.state.credentials[id] = credentials;
      if (!this.state.enabled.includes(id)) this.state.enabled.push(id);
      await this.saveState();
    }
    return status;
  }

  async disconnectBroker(id: string): Promise<void> {
    const connector = this.connectors.get(id);
    if (connector) {
      await connector.disconnect();
      delete this.state.credentials[id];
      this.state.enabled = this.state.enabled.filter((e) => e !== id);
      await this.saveState();
    }
  }

  // ── Unified Portfolio ──────────────────────────────────

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const allPositions: Position[] = [];
    const allBalances: Balance[] = [];
    const connectorStatuses = [];

    for (const connector of this.connectors.values()) {
      let positions: Position[] = [];
      let posCount = 0;

      if (connector.isConnected()) {
        try {
          positions = await connector.getPositions();
          allPositions.push(...positions);
          posCount = positions.length;
        } catch { /* connector failed, continue */ }

        try {
          const balances = await connector.getBalances();
          allBalances.push(...balances);
        } catch { /* continue */ }
      }

      connectorStatuses.push({
        id: connector.id,
        name: connector.name,
        connected: connector.isConnected(),
        lastSync: connector.getLastSync(),
        positionCount: posCount,
      });
    }

    // Compute totals
    const totalEquity = allPositions.reduce((s, p) => s + p.marketValue, 0);
    const totalCash = allBalances
      .filter((b) => b.currency === "USD" || b.accountType === "checking" || b.accountType === "savings")
      .reduce((s, b) => s + b.available, 0);

    // Group by account
    const accountMap = new Map<string, { connector: string; type: string; equity: number; count: number }>();
    for (const p of allPositions) {
      const key = `${p.connector}:${p.account}`;
      const existing = accountMap.get(key) ?? { connector: p.connector, type: p.accountType, equity: 0, count: 0 };
      existing.equity += p.marketValue;
      existing.count++;
      accountMap.set(key, existing);
    }

    const accounts = [...accountMap.entries()].map(([name, data]) => ({
      name: name.split(":")[1] ?? name,
      connector: data.connector,
      type: data.type,
      equity: Number(data.equity.toFixed(2)),
      positionCount: data.count,
    }));

    // Asset allocation
    const byAsset: Record<string, number> = {};
    for (const p of allPositions) {
      byAsset[p.assetType] = (byAsset[p.assetType] ?? 0) + p.marketValue;
    }
    const total = totalEquity || 1;

    // Sector exposure
    const bySector: Record<string, number> = {};
    for (const p of allPositions) {
      if (p.sector) {
        bySector[p.sector] = (bySector[p.sector] ?? 0) + p.marketValue;
      }
    }
    const sectorExposure: Record<string, number> = {};
    for (const [sector, value] of Object.entries(bySector)) {
      sectorExposure[sector] = Number(((value / total) * 100).toFixed(1));
    }

    return {
      totalEquity: Number(totalEquity.toFixed(2)),
      totalCash: Number(totalCash.toFixed(2)),
      accounts,
      positions: allPositions,
      allocation: {
        stocks: Number((((byAsset["stock"] ?? 0) / total) * 100).toFixed(1)),
        etfs: Number((((byAsset["etf"] ?? 0) / total) * 100).toFixed(1)),
        crypto: Number((((byAsset["crypto"] ?? 0) / total) * 100).toFixed(1)),
        bonds: Number((((byAsset["bond"] ?? 0) / total) * 100).toFixed(1)),
        mutualFunds: Number((((byAsset["mutual_fund"] ?? 0) / total) * 100).toFixed(1)),
        cash: Number((((byAsset["cash"] ?? 0) / total) * 100).toFixed(1)),
      },
      sectorExposure,
      connectorStatus: connectorStatuses,
    };
  }

  // ── Sync All ───────────────────────────────────────────

  async syncAll(): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};
    for (const connector of this.connectors.values()) {
      if (connector.isConnected()) {
        try {
          results[connector.id] = await connector.sync();
        } catch (err) {
          results[connector.id] = {
            success: false,
            positionsCount: 0,
            balancesCount: 0,
            errors: [(err as Error).message],
            duration: 0,
          };
        }
      }
    }
    return results;
  }

  // ── Reconnect from saved state ─────────────────────────

  async loadAndReconnect(): Promise<void> {
    await this.loadState();
    for (const id of this.state.enabled) {
      const creds = this.state.credentials[id];
      if (creds) {
        const connector = this.connectors.get(id);
        if (connector) {
          try { await connector.connect(creds); } catch { /* failed, will show as disconnected */ }
        }
      }
    }
  }

  // ── State Persistence ──────────────────────────────────

  private async loadState(): Promise<void> {
    try {
      const json = await readFile(CONNECTORS_STATE_PATH, "utf8");
      this.state = JSON.parse(json);
    } catch { /* no saved state */ }
  }

  private async saveState(): Promise<void> {
    const dir = path.dirname(CONNECTORS_STATE_PATH);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(CONNECTORS_STATE_PATH, JSON.stringify(this.state, null, 2));
  }
}
