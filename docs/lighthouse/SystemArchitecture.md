# Lighthouse — System Architecture
**Version:** 1.0  
**Date:** 2026-03-22  

---

## 1. Architecture Overview

Lighthouse follows a **monolithic Next.js application** pattern with a clear separation between:
- **Data Ingestion Layer** — background jobs that fetch and store raw market data
- **Computation Layer** — algorithms that process raw data into derived signals
- **API Layer** — Next.js Route Handlers serving JSON to the frontend
- **Frontend Layer** — React components rendering charts, tables, and dashboards

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LIGHTHOUSE APP                                │
│                                                                       │
│  ┌─────────────┐   ┌─────────────────┐   ┌────────────────────────┐ │
│  │  FRONTEND   │   │   API LAYER     │   │   BACKGROUND JOBS      │ │
│  │  (Next.js)  │◄──│  (Route Handler)│◄──│   (Vercel Cron)        │ │
│  │             │   │                 │   │                         │ │
│  │ Chart       │   │ /api/bars       │   │ daily_bars_fetcher      │ │
│  │ Scanner     │   │ /api/trendlines │   │ weekly_bars_fetcher     │ │
│  │ Earnings    │   │ /api/scanner    │   │ hourly_bars_fetcher     │ │
│  │ Watchlist   │   │ /api/watchlist  │   │ vix_fetcher             │ │
│  │ Overview    │   │ /api/earnings   │   │ earnings_fetcher        │ │
│  │ Categories  │   │ /api/categories │   │ trendline_engine        │ │
│  │ Tasks       │   │ /api/tasks      │   │ signal_generator        │ │
│  │ Notes       │   │ /api/notes      │   │ scanner_engine          │ │
│  │ Pipeline    │   │ /api/pipeline   │   └────────────────────────┘ │
│  └─────────────┘   └─────────────────┘              │                │
│                             │                        │                │
│                    ┌────────▼────────────────────────▼───────────┐   │
│                    │              DATABASE LAYER                   │   │
│                    │           PostgreSQL (Supabase)               │   │
│                    │                                               │   │
│                    │  bars │ trendlines │ scan_results │ signals  │   │
│                    │  notes │ tasks │ categories │ pipeline_status│   │
│                    └───────────────────────────────────────────────┘  │
│                             │                                          │
│                    ┌────────▼──────────┐  ┌────────────────────────┐  │
│                    │   CACHE LAYER     │  │   EXTERNAL APIs        │  │
│                    │   Redis (Upstash) │  │  Alpaca Markets        │  │
│                    │  scanner: 60s     │  │  Polygon.io            │  │
│                    │  categories: 60s  │  │  CBOE/Yahoo (VIX)      │  │
│                    │  watchlist: 60s   │  │  FMP (Earnings)        │  │
│                    └───────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (Complete)

### 2.1 Market Data Tables

```sql
-- Raw OHLCV price bars
CREATE TABLE bars (
  id          SERIAL PRIMARY KEY,
  ticker      VARCHAR(10) NOT NULL,
  timeframe   VARCHAR(10) NOT NULL,    -- 'weekly' | 'daily' | 'hourly'
  ts          TIMESTAMPTZ NOT NULL,
  open        NUMERIC(12,4),
  high        NUMERIC(12,4),
  low         NUMERIC(12,4),
  close       NUMERIC(12,4),
  volume      BIGINT,
  UNIQUE(ticker, timeframe, ts)
);
CREATE INDEX idx_bars_ticker_tf ON bars(ticker, timeframe, ts DESC);

-- VIX daily values
CREATE TABLE vix_data (
  id    SERIAL PRIMARY KEY,
  date  DATE UNIQUE NOT NULL,
  close NUMERIC(8,4)
);

-- Earnings calendar
CREATE TABLE earnings_calendar (
  id           SERIAL PRIMARY KEY,
  ticker       VARCHAR(10) NOT NULL,
  report_date  DATE NOT NULL,
  time_of_day  VARCHAR(5),  -- 'Pre' | 'Post' | 'AH' | null
  UNIQUE(ticker, report_date)
);
CREATE INDEX idx_earnings_date ON earnings_calendar(report_date);
```

### 2.2 Analysis Tables

```sql
-- Computed trendlines (both bot-detected and human-drawn)
CREATE TABLE trendlines (
  id          SERIAL PRIMARY KEY,
  ticker      VARCHAR(10) NOT NULL,
  timeframe   VARCHAR(10) NOT NULL,
  type        VARCHAR(10) NOT NULL,   -- 'support' | 'resistance'
  source      VARCHAR(10) NOT NULL,   -- 'bot' | 'human'
  x1_ts       TIMESTAMPTZ NOT NULL,
  x2_ts       TIMESTAMPTZ NOT NULL,
  y1          NUMERIC(12,4),
  y2          NUMERIC(12,4),
  slope       NUMERIC(18,8),          -- pre-computed: (y2-y1)/(x2-x1 in ms)
  touches     INT DEFAULT 2,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trendlines_ticker ON trendlines(ticker, active);

-- Scanner results cache (refreshed every 60s)
CREATE TABLE scan_results (
  id              SERIAL PRIMARY KEY,
  ticker          VARCHAR(10) NOT NULL,
  price           NUMERIC(12,4),
  signal_type     VARCHAR(5),          -- 'TL' | 'IX'
  level           NUMERIC(12,4),
  distance_atr    NUMERIC(8,4),
  distance_usd    NUMERIC(10,4),
  zone            VARCHAR(10),         -- 'ENTRY' | 'ALERT'
  timeframe       VARCHAR(10),
  direction       VARCHAR(10),         -- 'support' | 'resistance'
  timeframe_tags  TEXT[],              -- ['daily', 'weekly']
  earnings_date   DATE,
  scanned_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trading signals
CREATE TABLE trading_signals (
  id           SERIAL PRIMARY KEY,
  ticker       VARCHAR(10) NOT NULL,
  timeframe    VARCHAR(10) NOT NULL,
  signal_type  VARCHAR(50) NOT NULL,
  direction    VARCHAR(5),             -- 'bull' | 'bear'
  detail       TEXT,
  entry_price  NUMERIC(12,4),
  stop_price   NUMERIC(12,4),
  signal_date  DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_signals_ticker_date ON trading_signals(ticker, signal_date DESC);
```

### 2.3 User Data Tables

```sql
-- Categories and their tickers
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL,
  slug  VARCHAR(50) UNIQUE NOT NULL,
  position INT DEFAULT 0
);

CREATE TABLE category_tickers (
  category_id  INT REFERENCES categories(id) ON DELETE CASCADE,
  ticker       VARCHAR(10) NOT NULL,
  position     INT DEFAULT 0,
  PRIMARY KEY (category_id, ticker)
);

-- Kanban task lists
CREATE TABLE task_lists (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  position  INT DEFAULT 0,
  deleted   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kanban cards
CREATE TABLE tasks (
  id           SERIAL PRIMARY KEY,
  list_id      INT REFERENCES task_lists(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  priority     VARCHAR(10),  -- 'red' | 'yellow' | 'green'
  label        VARCHAR(50),
  label_color  VARCHAR(20),
  position     INT DEFAULT 0,
  deleted      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Task image attachments
CREATE TABLE task_attachments (
  id          SERIAL PRIMARY KEY,
  task_id     INT REFERENCES tasks(id) ON DELETE CASCADE,
  filename    VARCHAR(255),
  url         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notes (trade journal)
CREATE TABLE notes (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255),
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

-- Pipeline job status tracking
CREATE TABLE pipeline_status (
  id           SERIAL PRIMARY KEY,
  job_name     VARCHAR(50) UNIQUE NOT NULL,
  total        INT DEFAULT 0,
  completed    INT DEFAULT 0,
  latest_date  DATE,
  status       VARCHAR(20) DEFAULT 'idle',  -- 'idle' | 'running' | 'error'
  last_run_at  TIMESTAMPTZ,
  error_msg    TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. API Routes Reference

```
app/
├── api/
│   ├── bars/
│   │   └── route.ts              GET  ?ticker=&timeframe=
│   ├── trendlines/
│   │   ├── route.ts              GET  ?ticker=   POST (create human line)
│   │   └── [id]/route.ts         PATCH  DELETE
│   ├── sr-levels/
│   │   └── route.ts              GET  ?ticker=
│   ├── scanner/
│   │   ├── route.ts              GET  ?filter=
│   │   └── refresh/route.ts      POST
│   ├── watchlist/
│   │   ├── route.ts              GET
│   │   └── refresh/route.ts      POST
│   ├── earnings/
│   │   └── route.ts              GET  ?days=7
│   ├── signals/
│   │   └── route.ts              GET  ?limit=50&ticker=
│   ├── overview/
│   │   └── charts/route.ts       GET  ?page=1&per_page=24
│   ├── categories/
│   │   ├── route.ts              GET
│   │   └── [slug]/
│   │       ├── prices/route.ts   GET
│   │       └── tickers/
│   │           ├── route.ts      POST
│   │           └── [ticker]/     DELETE
│   ├── tasks/
│   │   ├── route.ts              GET  POST
│   │   ├── [id]/
│   │   │   ├── route.ts          PATCH  DELETE
│   │   │   └── attachments/      POST
│   │   ├── lists/
│   │   │   ├── route.ts          POST
│   │   │   └── [id]/route.ts     PATCH  DELETE
│   │   └── deleted/route.ts      GET
│   ├── notes/
│   │   ├── route.ts              GET  POST  ?q=
│   │   └── [id]/route.ts         GET  PATCH  DELETE
│   ├── vix/
│   │   └── route.ts              GET
│   └── pipeline/
│       ├── status/route.ts       GET
│       ├── refresh/route.ts      POST
│       └── missing/route.ts      GET  ?job=
```

---

## 4. Background Job Architecture

```
CRON SCHEDULE (all times ET):
┌─────────────────────────────────────────────────────────┐
│ Job                    │ Schedule         │ Duration est │
├─────────────────────────────────────────────────────────┤
│ daily_bars_fetcher     │ Mon-Fri 5:00 PM  │ ~5 min       │
│ weekly_bars_fetcher    │ Mon 5:30 PM      │ ~3 min       │
│ hourly_bars_fetcher    │ Mon-Fri 5:00 PM  │ ~15 min      │
│ vix_fetcher            │ Mon-Fri 4:30 PM  │ ~10 sec      │
│ earnings_fetcher       │ Daily 6:00 AM    │ ~30 sec      │
│ trendline_engine       │ Mon-Fri 5:30 PM  │ ~20 min      │
│ signal_generator       │ Mon-Fri 6:00 PM  │ ~5 min       │
│ scanner_engine         │ Every 60s        │ ~2 sec       │
└─────────────────────────────────────────────────────────┘
```

### Trendline Engine Detail

```
Input: bars table (OHLCV for one ticker/timeframe)
│
├── 1. Zigzag Pivots Detection
│      - Find local highs/lows using N-bar lookback window (default N=5)
│      - Filter pivots by ATR significance threshold
│
├── 2. Line Fitting
│      - Generate all pairs of pivot points
│      - Fit linear regression line through each pair
│      - Extend line to current date
│
├── 3. Line Scoring
│      - Count bars that "touch" line (within 0.5×ATR)
│      - Score = touches × recency_weight × length_bonus
│      - Keep top K lines (default K=5 per ticker/timeframe)
│
├── 4. Classification
│      - Line below price majority → support
│      - Line above price majority → resistance
│
└── Output: INSERT INTO trendlines (upsert on conflict)
```

---

## 5. Caching Strategy

```
┌──────────────────┬──────────────┬───────────────────────────┐
│ Data             │ Cache TTL    │ Cache Key Pattern          │
├──────────────────┼──────────────┼───────────────────────────┤
│ OHLCV bars       │ 24 hours     │ bars:{ticker}:{timeframe}  │
│ Trendlines       │ 1 hour       │ trendlines:{ticker}        │
│ S/R Levels       │ 5 minutes    │ sr:{ticker}                │
│ Scanner results  │ 60 seconds   │ scanner:all                │
│ Watchlist        │ 60 seconds   │ watchlist:all              │
│ Category prices  │ 60 seconds   │ cat:{slug}:prices          │
│ VIX latest       │ 1 hour       │ vix:latest                 │
│ Earnings 7d      │ 1 hour       │ earnings:7d                │
│ Trading signals  │ 5 minutes    │ signals:latest             │
└──────────────────┴──────────────┴───────────────────────────┘
```

---

## 6. Directory Structure

```
lighthouse/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Chart (/)
│   ├── scanner/page.tsx
│   ├── earnings/page.tsx
│   ├── watchlist/page.tsx
│   ├── overview/page.tsx
│   ├── categories/page.tsx
│   ├── tasks/page.tsx
│   ├── notes/page.tsx
│   ├── pipeline/page.tsx
│   ├── layout.tsx                # Global nav, dark theme
│   └── api/                      # All API routes (see §3)
│
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle ORM schema
│   │   ├── queries/              # Reusable DB query functions
│   │   │   ├── bars.ts
│   │   │   ├── trendlines.ts
│   │   │   ├── scanner.ts
│   │   │   └── ...
│   │   └── migrations/
│   │
│   ├── engine/
│   │   ├── trendlineEngine.ts    # Pivot detection + line fitting
│   │   ├── scannerEngine.ts      # Zone computation
│   │   ├── signalEngine.ts       # RSI/MACD/divergence signals
│   │   ├── watchlistEngine.ts    # Lookahead intersection finder
│   │   └── srLevels.ts           # S/R projection
│   │
│   ├── fetchers/
│   │   ├── alpaca.ts             # Alpaca API client
│   │   ├── vix.ts                # VIX data fetcher
│   │   └── earnings.ts           # Earnings calendar fetcher
│   │
│   ├── cache.ts                  # Redis / in-memory cache wrapper
│   └── indicators/
│       ├── atr.ts                # ATR(14) calculation
│       ├── rsi.ts                # RSI(14) calculation
│       ├── macd.ts               # MACD calculation
│       └── zigzag.ts             # Pivot detection
│
├── components/
│   ├── nav/Navbar.tsx
│   ├── chart/
│   │   ├── CandlestickChart.tsx
│   │   ├── DrawingToolbar.tsx
│   │   ├── SRLevelsOverlay.tsx
│   │   └── ChartLegend.tsx
│   ├── scanner/ScannerTable.tsx
│   ├── earnings/EarningsTable.tsx
│   ├── watchlist/WatchlistTable.tsx
│   ├── overview/
│   │   ├── SignalsPanel.tsx
│   │   └── MiniChartGrid.tsx
│   ├── categories/CategoryTable.tsx
│   ├── tasks/KanbanBoard.tsx
│   ├── notes/NoteEditor.tsx
│   └── pipeline/PipelineStatus.tsx
│
├── jobs/                         # Cron job handlers
│   ├── fetchDailyBars.ts
│   ├── fetchWeeklyBars.ts
│   ├── fetchHourlyBars.ts
│   ├── fetchVix.ts
│   ├── fetchEarnings.ts
│   ├── runTrendlineEngine.ts
│   ├── runSignalGenerator.ts
│   └── runScannerEngine.ts
│
├── vercel.json                   # Cron job config
├── .env.local                    # API keys, DB URL
└── package.json
```

---

## 7. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/lighthouse

# Cache
REDIS_URL=redis://...@upstash.io:6379

# Market Data APIs
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
ALPACA_BASE_URL=https://data.alpaca.markets

POLYGON_API_KEY=...
FMP_API_KEY=...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.vercel.app

# Vercel
CRON_SECRET=...
```

---

## 8. Security Considerations

- All API routes protected by session/JWT middleware
- CRON_SECRET validates Vercel cron requests
- No sensitive data exposed to client
- Rate limiting on external API fetchers (respect Alpaca 200 req/min limit)
- Database connection pooling via connection pool (max 10 connections)
