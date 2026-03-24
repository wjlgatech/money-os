# Security Screener — System Architecture
**Version:** 1.0
**Date:** 2026-03-22
**Parent system:** Money OS v3.1+

---

## 1. Design Philosophy

Lighthouse is a telescope — it scans the sky and tells you what's moving. Money OS is a doctor — it knows your body and tells you what's wrong. The Security Screener is the bridge: a telescope that knows which part of the sky matters to *you*.

Every signal must pass through three filters before reaching the user:
1. **Market filter** — Is this technically interesting? (trendline proximity, signal confluence)
2. **Thesis filter** — Does this fit what I believe? (alignment with stated investment thesis)
3. **Portfolio filter** — Does my portfolio need this? (underweight sector, diversification gap, tax-efficient timing)

If a signal doesn't survive all three, it doesn't surface. This is the fundamental architectural difference from Lighthouse.

---

## 2. Architecture Overview

The Security Screener operates as a **Money OS skill with a companion data service**. The skill (markdown instructions for Claude) handles user interaction, thesis interpretation, and portfolio-aware filtering. The data service (a lightweight API) handles market data ingestion, technical computation, and signal generation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MONEY OS PLUGIN                              │
│                                                                     │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐   │
│  │  EXISTING SKILLS     │   │  NEW: SECURITY SCREENER SKILL    │   │
│  │                      │   │                                  │   │
│  │  /thesis-to-trades   │◄──│  /screen    (find candidates)    │   │
│  │  /portfolio-check    │◄──│  /watchlist (early warnings)     │   │
│  │  /macro-check        │◄──│  /signals   (technical alerts)   │   │
│  │  /rebalance          │◄──│  /earnings  (catalyst calendar)  │   │
│  │  /decide             │   │                                  │   │
│  └──────────────────────┘   └───────────────┬──────────────────┘   │
│                                              │                      │
│                              Reads profile/holdings.md              │
│                              Reads profile/goals.md                 │
│                              Reads profile/financial-identity.md    │
│                                              │                      │
└──────────────────────────────────────────────┼──────────────────────┘
                                               │
                              ┌─────────────────▼─────────────────┐
                              │     SCREENER DATA SERVICE          │
                              │     (Next.js API on Vercel)        │
                              │                                    │
                              │  ┌──────────┐  ┌───────────────┐  │
                              │  │  INGEST   │  │  COMPUTATION  │  │
                              │  │           │  │               │  │
                              │  │  Bars     │  │  Trendline    │  │
                              │  │  VIX      │  │  Engine       │  │
                              │  │  Earnings │  │  Signal Gen   │  │
                              │  │  Fundmtls │  │  Scanner      │  │
                              │  │  Crypto   │  │  Watchlist    │  │
                              │  └─────┬─────┘  └───────┬───────┘  │
                              │        │                │          │
                              │  ┌─────▼────────────────▼───────┐  │
                              │  │         PostgreSQL            │  │
                              │  │  bars │ trendlines │ signals  │  │
                              │  │  fundamentals │ scan_results  │  │
                              │  └──────────────┬────────────────┘  │
                              │                 │                   │
                              │  ┌──────────────▼────────────────┐  │
                              │  │      Redis (Upstash)          │  │
                              │  │  scanner:60s  │  quotes:60s   │  │
                              │  └───────────────────────────────┘  │
                              │                                    │
                              │  ┌────────────────────────────────┐ │
                              │  │      EXTERNAL APIs             │ │
                              │  │  Alpaca (stocks)               │ │
                              │  │  CoinGecko (crypto)            │ │
                              │  │  FMP (fundamentals + earnings) │ │
                              │  │  CBOE/Yahoo (VIX)              │ │
                              │  └────────────────────────────────┘ │
                              └────────────────────────────────────┘
```

### Key Architectural Decision: Two-Layer Split

**Why not put everything in the Claude skill?**
Claude can do web searches for individual stock data, but it can't run a trendline engine across 500+ tickers, maintain a database of historical bars, or compute ATR-adjusted zones in real time. The computation must live in a persistent service.

**Why not build a full standalone app like Lighthouse?**
Because the intelligence layer — "should *I* buy this, given *my* portfolio, *my* thesis, *my* tax situation" — requires the full context of the user's financial profile, which lives in Money OS's local markdown files. Claude has that context. A standalone app doesn't.

So: **data service handles market math, Claude skill handles personal finance judgment.**

---

## 3. Data Model

### 3.1 Market Data (same as Lighthouse — proven design)

```sql
-- OHLCV bars: stocks + crypto
CREATE TABLE bars (
  id        SERIAL PRIMARY KEY,
  ticker    VARCHAR(20) NOT NULL,       -- wider than Lighthouse (crypto tickers)
  asset     VARCHAR(10) NOT NULL,       -- 'stock' | 'crypto' | 'etf'
  timeframe VARCHAR(10) NOT NULL,       -- 'weekly' | 'daily'
  ts        TIMESTAMPTZ NOT NULL,
  open      NUMERIC(16,6),             -- 6 decimals for crypto
  high      NUMERIC(16,6),
  low       NUMERIC(16,6),
  close     NUMERIC(16,6),
  volume    NUMERIC(20,2),
  UNIQUE(ticker, timeframe, ts)
);

CREATE TABLE vix_data (
  id    SERIAL PRIMARY KEY,
  date  DATE UNIQUE NOT NULL,
  close NUMERIC(8,4)
);

CREATE TABLE earnings_calendar (
  id          SERIAL PRIMARY KEY,
  ticker      VARCHAR(20) NOT NULL,
  report_date DATE NOT NULL,
  time_of_day VARCHAR(5),
  UNIQUE(ticker, report_date)
);
```

### 3.2 Fundamental Data (NEW — not in Lighthouse)

```sql
CREATE TABLE fundamentals (
  id              SERIAL PRIMARY KEY,
  ticker          VARCHAR(20) NOT NULL,
  as_of_date      DATE NOT NULL,
  market_cap      NUMERIC(16,2),
  pe_ratio        NUMERIC(10,4),
  ps_ratio        NUMERIC(10,4),
  revenue_growth  NUMERIC(8,4),       -- YoY %
  earnings_growth NUMERIC(8,4),       -- YoY %
  gross_margin    NUMERIC(8,4),
  net_margin      NUMERIC(8,4),
  debt_to_equity  NUMERIC(8,4),
  free_cash_flow  NUMERIC(16,2),
  dividend_yield  NUMERIC(8,4),
  sector          VARCHAR(50),
  industry        VARCHAR(100),
  UNIQUE(ticker, as_of_date)
);
```

### 3.3 Analysis Tables (adapted from Lighthouse)

```sql
CREATE TABLE trendlines (
  id        SERIAL PRIMARY KEY,
  ticker    VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  type      VARCHAR(10) NOT NULL,       -- 'support' | 'resistance'
  x1_ts     TIMESTAMPTZ NOT NULL,
  x2_ts     TIMESTAMPTZ NOT NULL,
  y1        NUMERIC(16,6),
  y2        NUMERIC(16,6),
  slope     NUMERIC(20,10),
  touches   INT DEFAULT 2,
  score     NUMERIC(8,4),               -- composite quality score
  active    BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scanner results: stocks + crypto, with fundamental overlay
CREATE TABLE scan_results (
  id             SERIAL PRIMARY KEY,
  ticker         VARCHAR(20) NOT NULL,
  asset          VARCHAR(10) NOT NULL,
  price          NUMERIC(16,6),
  signal_type    VARCHAR(10),            -- 'TL' | 'IX' | 'W'
  level          NUMERIC(16,6),
  distance_atr   NUMERIC(8,4),
  zone           VARCHAR(10),            -- 'ENTRY' | 'ALERT'
  timeframe      VARCHAR(10),
  direction      VARCHAR(10),
  -- fundamental overlay (NEW)
  pe_ratio       NUMERIC(10,4),
  revenue_growth NUMERIC(8,4),
  sector         VARCHAR(50),
  earnings_date  DATE,
  scanned_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trading_signals (
  id          SERIAL PRIMARY KEY,
  ticker      VARCHAR(20) NOT NULL,
  timeframe   VARCHAR(10) NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  direction   VARCHAR(5),
  detail      TEXT,
  entry_price NUMERIC(16,6),
  stop_price  NUMERIC(16,6),
  signal_date DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 User Configuration (NEW — replaces Lighthouse's hardcoded universe)

```sql
-- User-defined ticker universe (replaces hardcoded 549)
CREATE TABLE watched_tickers (
  id       SERIAL PRIMARY KEY,
  ticker   VARCHAR(20) NOT NULL UNIQUE,
  asset    VARCHAR(10) NOT NULL,
  source   VARCHAR(20) NOT NULL,         -- 'portfolio' | 'watchlist' | 'sector'
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sector groupings (replaces Lighthouse's fixed categories)
CREATE TABLE sectors (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE sector_tickers (
  sector_id INT REFERENCES sectors(id) ON DELETE CASCADE,
  ticker    VARCHAR(20) NOT NULL,
  PRIMARY KEY (sector_id, ticker)
);

CREATE TABLE pipeline_status (
  id          SERIAL PRIMARY KEY,
  job_name    VARCHAR(50) UNIQUE NOT NULL,
  total       INT DEFAULT 0,
  completed   INT DEFAULT 0,
  latest_date DATE,
  status      VARCHAR(20) DEFAULT 'idle',
  last_run_at TIMESTAMPTZ,
  error_msg   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Computation Engines

### 4.1 Trendline Engine (adapted from Lighthouse)

Same algorithm — it's well-designed:
1. Zigzag pivot detection (N=5 lookback)
2. Pivot-pair line candidates
3. Score by touches × recency × slope quality
4. Keep top K=5 per ticker/timeframe
5. Classify support vs. resistance
6. Compute slope and projection coordinates

**Adaptation:** Runs on weekly + daily only (no hourly). Handles crypto's 24/7 market by using UTC daily closes.

### 4.2 Scanner Engine (adapted from Lighthouse)

Same VIX-adjusted ATR zone logic — it's the best part of Lighthouse:
- Entry Zone: distance ≤ 1.0 × ATR × (VIX/20)
- Alert Zone: distance in [0.5, 1.5] × ATR × (VIX/20)
- Intersection detection: weekly + daily lines converge within 0.5×ATR

**Adaptation:** Adds a fundamental quality filter. Scanner results include P/E, revenue growth, and sector so Claude can apply thesis + portfolio filters on top.

### 4.3 Signal Engine (adapted from Lighthouse)

Same signal types:
- RSI(14) oversold/overbought
- MACD(12,26,9) crossover
- Bullish/bearish divergence (price vs RSI)
- Proximity to trendline (within 1×ATR)
- VIX Entry signal with entry + stop levels

**Adaptation:** No new signal types. These are sufficient for the timing layer. The intelligence layer (Claude) adds the "should you act on this signal" judgment.

### 4.4 Fundamental Enrichment (NEW)

Runs daily after bars fetch. For each ticker in the universe:
- Fetch quarterly fundamentals from FMP API
- Store in `fundamentals` table
- Attach key ratios to scan results so Claude can filter

This is the data that lets Claude say "AAPL is at support AND trading at 18× earnings vs. 5-year average of 25×" instead of just "AAPL is at support."

---

## 5. API Layer

```
/api/
├── bars/
│   └── route.ts              GET  ?ticker=&timeframe=
├── trendlines/
│   └── route.ts              GET  ?ticker=
├── sr-levels/
│   └── route.ts              GET  ?ticker=
├── scanner/
│   ├── route.ts              GET  ?filter=&sector=&asset=
│   └── refresh/route.ts      POST
├── watchlist/
│   └── route.ts              GET
├── earnings/
│   └── route.ts              GET  ?days=7
├── signals/
│   └── route.ts              GET  ?limit=50&ticker=
├── fundamentals/
│   └── route.ts              GET  ?ticker=
├── sectors/
│   ├── route.ts              GET
│   └── [slug]/
│       └── prices/route.ts   GET
├── universe/
│   ├── route.ts              GET  POST
│   └── sync/route.ts         POST  (sync from portfolio)
├── vix/
│   └── route.ts              GET
└── pipeline/
    ├── status/route.ts       GET
    └── refresh/route.ts      POST
```

**Removed from Lighthouse:** `/api/tasks`, `/api/notes`, human trendline CRUD, hourly bars.
**Added:** `/api/fundamentals`, `/api/universe` (dynamic ticker management), sector filtering on scanner.

---

## 6. Background Jobs

```
CRON SCHEDULE (all times ET):
┌──────────────────────────────────────────────────────────┐
│ Job                     │ Schedule          │ Duration    │
├──────────────────────────────────────────────────────────┤
│ daily_bars_fetcher      │ Mon-Fri 5:00 PM   │ ~5 min      │
│ weekly_bars_fetcher     │ Mon 5:30 PM       │ ~3 min      │
│ crypto_bars_fetcher     │ Daily 12:00 AM    │ ~2 min      │
│ vix_fetcher             │ Mon-Fri 4:30 PM   │ ~10 sec     │
│ earnings_fetcher        │ Daily 6:00 AM     │ ~30 sec     │
│ fundamentals_fetcher    │ Daily 6:30 AM     │ ~3 min      │
│ trendline_engine        │ Mon-Fri 5:30 PM   │ ~15 min     │
│ signal_generator        │ Mon-Fri 6:00 PM   │ ~5 min      │
│ scanner_engine          │ Mon-Fri 6:15 PM   │ ~30 sec     │
└──────────────────────────────────────────────────────────┘
```

**Key difference from Lighthouse:** Scanner runs once after market close, not every 60 seconds. Personal investors don't need real-time scanning. This cuts Vercel compute costs by ~1400x.

Crypto bars run daily at midnight UTC (24/7 market, one snapshot per day is sufficient for weekly/daily analysis).

---

## 7. Integration with Money OS Skills

This is the architecture that Lighthouse can never have — the data service feeds into Claude's financial judgment:

```
User: "/screen for undervalued tech stocks near support"
         │
         ▼
┌─────────────────────────────────────────────────┐
│ Security Screener Skill (Claude)                │
│                                                 │
│ 1. Fetch scanner results from data service      │
│    GET /api/scanner?filter=entry&sector=tech    │
│                                                 │
│ 2. Read profile/holdings.md                     │
│    → Know current tech exposure (e.g., 38%)     │
│                                                 │
│ 3. Read profile/goals.md                        │
│    → Know target allocation (e.g., tech ≤ 30%)  │
│                                                 │
│ 4. Read profile/financial-identity.md           │
│    → Know tax bracket, holding periods          │
│                                                 │
│ 5. Apply portfolio filter:                      │
│    "You're already overweight tech by 8%.       │
│     3 stocks are at support, but adding more    │
│     tech increases concentration risk.           │
│     However, QCOM (P/E 14, rev +22%) would     │
│     diversify within tech — you have no         │
│     Qualcomm exposure and it fits your          │
│     AI-infrastructure thesis."                  │
│                                                 │
│ 6. Position sizing:                             │
│    "$2,400 (1.5% of portfolio) keeps tech       │
│     at 39% — still over target, but the         │
│     quality justifies a small position."        │
│                                                 │
│ 7. Tax check:                                   │
│    "Funding source: trim MSFT (held 14 months,  │
│     long-term gains rate). Don't sell AMZN      │
│     (held 9 months — would trigger short-term   │
│     rate)."                                     │
└─────────────────────────────────────────────────┘
```

---

## 8. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | Same as Lighthouse — proven for this workload |
| Language | TypeScript | Type safety for financial math |
| Database | PostgreSQL (Supabase) | Same as Lighthouse — reliable, free tier sufficient |
| Cache | Redis (Upstash) | Same as Lighthouse — needed for quote caching |
| Stock Data | Alpaca Markets API | Same as Lighthouse — good free tier, reliable |
| Crypto Data | CoinGecko API | Free tier covers top 100 coins |
| Fundamentals | Financial Modeling Prep | Quarterly financials, earnings calendar |
| VIX | CBOE via Yahoo Finance | Same as Lighthouse |
| Chart Library | Lightweight Charts (TradingView) | Same as Lighthouse — for any optional web UI |
| Deployment | Vercel | Same as Lighthouse — handles cron + serverless |

---

## 9. Security & Privacy

- **No user financial data in the data service.** The database holds only market data (bars, trendlines, signals). The user's portfolio, holdings, tax info, and goals stay in Money OS's local markdown files. The data service never sees them.
- **API authentication:** Simple bearer token. Single-user service.
- **Rate limiting:** Respect Alpaca 200 req/min, CoinGecko 30 req/min, FMP 250 req/day.
- **No PII:** The ticker universe is the only user-specific data in the database, and tickers are not PII.

---

## 10. What We Deliberately Did NOT Build

| Omitted | Why |
|---------|-----|
| Kanban board | Generic project management. Use a project management tool. |
| Notes app | Generic notepad. Money OS's `profile/history.md` is a better trade journal. |
| Hourly bars | Irrelevant for personal investors. Saves ~60% of data ingestion cost. |
| Human trendline drawing | Power-trader feature. Bot trendlines are sufficient for investment-level decisions. |
| 60-second scanner refresh | Day-trader infrastructure. Daily post-market scan is sufficient. |
| Standalone web dashboard | The intelligence layer is Claude. A dashboard without portfolio context is just another chart app. Optional future enhancement if users want visual browsing. |
