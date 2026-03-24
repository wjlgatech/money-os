# Connector Architecture — MCP-Style Broker Integration

## Design Philosophy

Money OS connects to your financial life through **connectors** — standardized adapters that speak each broker's language but expose a unified interface to the agent.

Think of it like USB-C: different devices, same plug.

```
┌────────────────────────────────────────────────────────────┐
│                    MONEY OS AGENT                           │
│                                                            │
│  Unified Interface:                                        │
│    getPositions()  getBalances()  getTransactions()         │
│    placeOrder()    getOrderStatus()                         │
└─────────────┬──────────────────────────────────────────────┘
              │
    ┌─────────▼──────────┐
    │  CONNECTOR MANAGER │  Discovers, loads, manages connectors
    │  (MCP-style)       │  Health checks, credential rotation
    └─────┬──────┬───────┘
          │      │
  ┌───────▼──┐ ┌─▼──────────┐ ┌──────────┐ ┌──────────┐
  │ Alpaca   │ │ Coinbase    │ │ Fidelity │ │ Moomoo   │
  │ Connector│ │ Connector   │ │ Connector│ │ Connector│
  │          │ │             │ │          │ │          │
  │ REST API │ │ REST API    │ │ Plaid    │ │ REST API │
  │ WebSocket│ │ WebSocket   │ │ (or OFX) │ │          │
  └──────────┘ └─────────────┘ └──────────┘ └──────────┘

  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Kraken   │ │ Schwab   │ │Screenshot│  ← "connector" for
  │ Connector│ │ Connector│ │ Connector│    manual import
  └──────────┘ └──────────┘ └──────────┘
```

## Connector Interface

Every connector implements this interface:

```typescript
interface BrokerConnector {
  // Identity
  id: string;                    // "alpaca", "coinbase", "fidelity"
  name: string;                  // "Alpaca Markets"
  type: "broker" | "exchange" | "bank" | "manual";
  assetClasses: string[];        // ["stocks", "etfs", "crypto"]

  // Connection
  connect(credentials: ConnectorCredentials): Promise<ConnectionStatus>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getHealth(): Promise<HealthStatus>;

  // Read
  getAccount(): Promise<AccountSummary>;
  getPositions(): Promise<Position[]>;
  getBalances(): Promise<Balance[]>;
  getTransactions(since?: Date): Promise<Transaction[]>;
  getOpenOrders(): Promise<Order[]>;

  // Write (optional — not all connectors support execution)
  placeOrder?(order: OrderRequest): Promise<OrderResult>;
  cancelOrder?(orderId: string): Promise<void>;

  // Sync
  getLastSync(): Date | null;
  sync(): Promise<SyncResult>;        // Full refresh of positions + balances
}

interface ConnectorCredentials {
  type: "api_key" | "oauth" | "plaid" | "screenshot" | "manual";
  apiKey?: string;
  apiSecret?: string;
  oauthToken?: string;
  plaidAccessToken?: string;
}

interface Position {
  connector: string;             // which connector provided this
  account: string;               // account name/number
  accountType: string;           // "brokerage" | "ira" | "roth_ira" | "401k" | "crypto"
  ticker: string;
  assetType: string;             // "stock" | "etf" | "crypto" | "bond" | "mutual_fund"
  quantity: number;
  avgCostBasis: number | null;   // null if not available
  currentPrice: number | null;
  marketValue: number;
  unrealizedPnl: number | null;
  sector: string | null;
  lastUpdated: Date;
}
```

## Available Connectors (by implementation difficulty)

### Tier 1: Ready Now
| Connector | Method | Effort | Notes |
|-----------|--------|--------|-------|
| **Screenshot** | Claude vision OCR | Done | Works with any broker, any layout |
| **Manual entry** | User types holdings | Done | Via /setup or conversation |
| **Alpaca** | REST API | Done | Paper + live trading, US stocks |

### Tier 2: API Available (build next)
| Connector | Method | Effort | Notes |
|-----------|--------|--------|-------|
| **Coinbase** | REST API + OAuth | ~2 hours | Crypto balances + transactions |
| **Kraken** | REST API + API key | ~2 hours | Crypto balances + transactions |
| **Moomoo** | OpenAPI | ~3 hours | US + HK stocks, paper + live |

### Tier 3: Aggregator (connects many at once)
| Connector | Method | Effort | Notes |
|-----------|--------|--------|-------|
| **Plaid** | Plaid API | ~4 hours | Connects Fidelity, Schwab, Vanguard, most banks. Costs $$/mo. |
| **Yodlee** | Yodlee API | ~4 hours | Alternative to Plaid |

### Tier 4: File Import
| Connector | Method | Effort | Notes |
|-----------|--------|--------|-------|
| **CSV import** | File parse | ~1 hour | Most brokers offer CSV export |
| **OFX/QFX import** | File parse | ~2 hours | Quicken/financial export format |

## Connector Manager

The manager handles:
1. **Discovery** — which connectors are available
2. **Credentials** — stored locally in `profile/connectors.md` (gitignored)
3. **Health** — periodic checks that connections are still valid
4. **Sync** — scheduled refresh of positions across all connectors
5. **Merge** — combines positions from all connectors into a unified view

```typescript
class ConnectorManager {
  private connectors: Map<string, BrokerConnector>;

  // Register a new connector
  register(connector: BrokerConnector): void;

  // Get unified view across all connected accounts
  getAllPositions(): Promise<Position[]>;
  getTotalEquity(): Promise<number>;
  getAssetAllocation(): Promise<Record<string, number>>;
  getSectorExposure(): Promise<Record<string, number>>;

  // The agent uses this to know the user's REAL financial picture
  getPortfolioSummary(): Promise<{
    totalEquity: number;
    accounts: Array<{ name: string; connector: string; equity: number }>;
    positions: Position[];
    allocation: { stocks: number; etfs: number; crypto: number; bonds: number; cash: number };
    sectorExposure: Record<string, number>;
  }>;
}
```

## Security Model

- **Credentials stored locally** in `profile/connectors.md` (gitignored, never committed)
- **Read-only by default** — connectors fetch data but don't trade unless explicitly enabled
- **Per-connector permissions** — user approves each connector's access level:
  - Level 0: No connection (screenshot/manual only)
  - Level 1: Read-only (see positions and balances)
  - Level 2: Read + trade (execute orders via the connector)
- **Credential rotation** — the manager warns when API keys are old or tokens expire
- **No aggregation service** — unlike Plaid (which is a middleman), direct API connectors talk to the broker without a third party seeing your data

## How This Changes the Agent

With connectors, the agent knows your REAL financial situation:

```
BEFORE (Alpaca paper only):
  "You have $100K. AAPL is at support."

AFTER (Fidelity + Coinbase + Moomoo connected):
  "Across your 3 accounts ($247K total), you're 42% tech, 18% crypto,
   and have zero healthcare exposure. AMGN is at weekly support —
   adding $5K would bring healthcare to 8% and improve diversification.
   Fund it by trimming AAPL from your Fidelity account (held 14 months,
   long-term gains rate) rather than NVDA from Moomoo (held 9 months,
   short-term rate, $800 more in taxes)."
```

The agent becomes dramatically more useful when it can see everything.
