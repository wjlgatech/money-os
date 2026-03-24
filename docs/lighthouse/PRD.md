# Lighthouse — Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** 2026-03-22  
**App:** Lighthouse v0.5.0 — AI-powered Stock Chart Analysis  
**URL:** https://lighthouse-v3.vercel.app  

---

## 1. Product Overview

Lighthouse is a personal stock-market intelligence dashboard built for an active trader/analyst. It combines automated multi-timeframe technical analysis (trendline detection, signal generation, S/R level computation) with personal productivity tools (kanban task board, freeform notes) and market-breadth monitoring (categories, earnings calendar). The system ingests OHLCV price data for ~549 tickers across Weekly, Daily, and Hourly timeframes, runs a proprietary Trendline Engine, generates trading signals, and surfaces actionable scan results through a clean dark-theme UI.

---

## 2. Goals & Non-Goals

### Goals
- Automatically detect and store trendlines across 3 timeframes for 549 tickers
- Surface confluence intersection signals with VIX-adjusted ATR entry/alert zones
- Provide an earnings calendar enriched with trendline proximity data
- Give a real-time category-level price dashboard (sector monitoring)
- Allow the user to annotate charts, manage tasks, and write trade notes
- Expose a pipeline status dashboard so the user can monitor data freshness

### Non-Goals
- No social/multi-user support (single-user private tool)
- No order execution or brokerage integration
- No mobile-native app (web only)
- No real-time streaming tick data (daily EOD + delayed intraday)

---

## 3. Tag-by-Tag Feature Specification

---

### 3.1 CHART Tab  
**Route:** `/?ticker=AAPL&timeframe=weekly`  
**Screenshot:** `screenshots/01-chart.png`

#### WHAT (What the user sees)
- Two stacked candlestick chart panels: **Weekly** (top) and **Daily** (bottom)
- Each panel shows: OHLCV candlesticks, volume bars, trendlines (human-drawn in orange, bot-detected in dashed purple), a horizontal dotted red line (S/R marker), price axis labels for S1/S2/R1
- Floating **S/R Levels** tooltip showing current price, up to 2 Support and 1–2 Resistance levels with % distance and timeframe badge
- **Legend row:** W (purple), D (blue), Human (orange), Bot (dashed), Conf (purple dot)
- **Drawing toolbar** (left side of each panel): Pointer, Trendline, Horizontal line, Short line
- **Timeframe toggle:** W / D buttons above the top chart
- **Status bar** below each chart: `N lines · N conf · 2S/1R · Last: $XXX.XX`
- **Fullscreen** button per panel

#### WHY (Why it exists)
The chart is the core workspace. The trader needs to see multi-timeframe context simultaneously (weekly trend + daily detail). Trendlines are the primary analytical tool — the system auto-detects them but the user can also draw manually. S/R levels give immediate visual context for trade decisions.

#### HOW (Backend implementation)

**Data Fetching:**
- Source: Alpaca Markets API (or Polygon.io) — OHLCV bars
- Fetch cadence: Daily EOD cron job for Weekly + Daily bars; separate job for Hourly
- Storage: PostgreSQL table `bars` schema:
  ```sql
  CREATE TABLE bars (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(10) NOT NULL,
    timeframe   VARCHAR(10) NOT NULL,  -- 'weekly' | 'daily' | 'hourly'
    ts          TIMESTAMPTZ NOT NULL,
    open        NUMERIC,
    high        NUMERIC,
    low         NUMERIC,
    close       NUMERIC,
    volume      BIGINT,
    UNIQUE(ticker, timeframe, ts)
  );
  ```

**Trendline Engine (Bot-detected lines):**
- Algorithm: Iterates over a rolling window of N bars (configurable), finds local pivot highs/lows using a zigzag-style algorithm, fits lines through pivot pairs using linear regression, scores lines by: number of touches, recency, ATR proximity
- Output stored in `trendlines` table:
  ```sql
  CREATE TABLE trendlines (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(10) NOT NULL,
    timeframe   VARCHAR(10) NOT NULL,
    type        VARCHAR(10),  -- 'support' | 'resistance'
    source      VARCHAR(10),  -- 'bot' | 'human'
    x1_ts       TIMESTAMPTZ,
    x2_ts       TIMESTAMPTZ,
    y1          NUMERIC,
    y2          NUMERIC,
    touches     INT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ```

**Human-drawn lines:**
- User draws via canvas drag interaction
- Persisted via `POST /api/trendlines` → stored in same table with `source='human'`
- Deletable via `DELETE /api/trendlines/:id`

**S/R Levels Computation:**
- At chart load time, API fetches all active trendlines for the ticker
- Projects each line to the current date using slope extrapolation: `y = y1 + slope × (current_ts - x1_ts)`
- Classifies as Support (line below current price) or Resistance (line above)
- Sorts by proximity, returns top 2 supports + top 2 resistances
- Endpoint: `GET /api/sr-levels?ticker=AAPL`

**API Endpoints:**
```
GET  /api/bars?ticker=AAPL&timeframe=weekly      → OHLCV array
GET  /api/trendlines?ticker=AAPL                  → all lines for ticker
POST /api/trendlines                               → create human line
DELETE /api/trendlines/:id                         → delete line
GET  /api/sr-levels?ticker=AAPL                   → S/R level objects
```

**Frontend Rendering:**
- Chart library: Lightweight Charts (TradingView) or custom Canvas2D
- Two separate chart instances sharing synchronized time axis
- Legend colors: weekly=purple (#8b5cf6), daily=blue (#3b82f6), human=orange (#f97316), bot=dashed purple, conf=purple dot

---

### 3.2 SCANNER Tab  
**Route:** `/scanner`  
**Screenshot:** `screenshots/02-scanner.png`

#### WHAT
- Title + subtitle explaining scan logic
- 5 stats cards: VIX, Vol Factor, Tickers Scanned, Matches, Updated
- Signal Types explanation panel (IX = Intersection, TL = Trendline)
- Filter tabs: All | Light | W Pattern | Trendline | Intersection | Entry Zone | Alert Zone
- Results table: Ticker, Price, Type (TL/IX badge), Level, Distance (in ATR + $), Zone (ENTRY/ALERT), Timeframes (daily/weekly + support/resistance tags), Earnings date
- Footer formula + auto-refresh 60s notice

#### WHY
The scanner is the daily action list. It answers: "Which stocks are near a key trendline right now?" The VIX-adjusted ATR zone system filters noise — high-VIX environments widen the entry/alert bands so the same setup doesn't fire too early in volatile conditions.

#### HOW

**Core Scan Algorithm (runs server-side, cached):**

1. **Fetch latest close price** for all 549 tickers
2. **Fetch latest ATR(14)** per ticker per timeframe
3. **Fetch VIX** latest value from `vix_data` table
4. **Compute Vol Factor:** `vix / 20` (so VIX=20 → factor 1.0, VIX=40 → factor 2.0)
5. **For each trendline** of each ticker, project line to current date to get `level`
6. **Compute distance:** `abs(close - level)`
7. **Compute ATR zone bands:**
   - Entry Zone threshold: `1.0 × ATR × (VIX/20)`
   - Alert Zone range: `[0.5, 1.5] × ATR × (VIX/20)`
8. **Classify:**
   - If distance ≤ Entry threshold → "ENTRY"
   - If distance in [0.5×ATR×vf, 1.5×ATR×vf] → "ALERT"
9. **Intersection detection:** If weekly trendline and daily trendline project to within 0.5×ATR of each other at current date → mark as "IX" type, otherwise "TL"
10. **W Pattern filter:** Detect W-shaped price patterns in recent N bars (price drops, recovers, re-tests low, bounces)

**Scan result stored in `scan_results` table** (updated every 60s via server-side timer or cron):
```sql
CREATE TABLE scan_results (
  id          SERIAL PRIMARY KEY,
  ticker      VARCHAR(10),
  price       NUMERIC,
  type        VARCHAR(5),   -- 'TL' | 'IX'
  level       NUMERIC,
  distance_atr NUMERIC,
  distance_usd NUMERIC,
  zone        VARCHAR(10),  -- 'ENTRY' | 'ALERT'
  timeframe   VARCHAR(10),
  direction   VARCHAR(10),  -- 'support' | 'resistance'
  earnings_date DATE,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Light filter** = intersection signals where distance is very small (< 0.3 ATR)
**W Pattern** = additional pass detecting W-shaped reversal setups

**API Endpoints:**
```
GET /api/scanner                              → full scan results (cached)
GET /api/scanner?filter=light                 → filtered results
GET /api/scanner?filter=intersection          → IX only
POST /api/scanner/refresh                     → trigger re-scan
GET /api/vix                                  → current VIX value
```

---

### 3.3 EARNINGS Tab  
**Route:** `/earnings`  
**Screenshot:** `screenshots/03-earnings.png`

#### WHAT
- "Earnings Calendar" — next 7 days, grouped by date
- Each date group shows N reports
- Table per group: Ticker, Time (Pre/Post/AH badge), Price, Trendline(W) level, Distance (%), Type (SUP/RES badge), Near S/R within 2 ATR (S1D, S2D badges)

#### WHY
Earnings events cause large price moves. This view tells the trader: "Which upcoming earnings reports have stocks near key weekly trendlines?" This identifies high-conviction setups where an earnings catalyst could confirm or invalidate a technical level.

#### HOW

**Earnings Data Source:**
- Source: Alpaca Earnings Calendar API or Financial Modeling Prep API
- Stored in `earnings_calendar` table:
  ```sql
  CREATE TABLE earnings_calendar (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(10) NOT NULL,
    report_date DATE NOT NULL,
    time_of_day VARCHAR(5),  -- 'Pre' | 'Post' | 'AH' | null
    UNIQUE(ticker, report_date)
  );
  ```
- Refresh cadence: Daily cron job, fetches next 30 days

**Trendline Enrichment (at query time):**
- For each ticker with earnings in next 7 days:
  1. Project weekly trendline to earnings date → `trendline_level`
  2. Compute distance: `(close - trendline_level) / close × 100`
  3. Classify support/resistance
  4. Find all S/R levels within 2×ATR(14) of current price
- Returns enriched rows with full context

**API Endpoints:**
```
GET /api/earnings?days=7          → next 7 days earnings with trendline enrichment
GET /api/earnings?days=30         → next 30 days
```

---

### 3.4 WATCHLIST Tab  
**Route:** `/watchlist`  
**Screenshot:** `screenshots/04-watchlist.png`

#### WHAT
- "Watchlist" — "Tickers where close ± 2×ATR reaches a trendline intersection"
- Stats: VIX, ATR Threshold (2× ATR), Tickers Scanned, Matches, Updated
- "How This Works" explanation card
- Results table: Ticker, Price, Intersection level, Distance (ATR + $), Range ($low – $high), Timeframes (tags), DIR (BUY/SELL in green/red)

#### WHY
The Watchlist is the "early warning" system — a lookahead before the Scanner fires. While the Scanner shows stocks already within the entry/alert zone, the Watchlist shows stocks that are 1–2 sessions away from hitting that zone. This gives the trader time to research and prepare a position.

#### HOW

**Algorithm:**
- Same trendline projection as Scanner
- Expand the proximity window: check if `close ± 2×ATR(14)` range overlaps with any trendline intersection within ±2 calendar weeks
- "Range" column = `[close - 2×ATR, close + 2×ATR]`
- DIR = BUY if approaching from below (support), SELL if approaching from above (resistance)
- Intersection must be a multi-timeframe crossing (IX type)

**API Endpoints:**
```
GET /api/watchlist                  → approaching intersection stocks (cached)
POST /api/watchlist/refresh         → force refresh
```

---

### 3.5 OVERVIEW Tab  
**Route:** `/overview`  
**Screenshot:** `screenshots/05-overview.png`

#### WHAT
- "All Charts Overview"
- **Trading Signals panel** (scrollable list): per-ticker signal badges (📈/📉 + type + timeframe + days ago)
- **Mini Chart Grid** (4 columns, paginated): thumbnail chart cards per ticker × timeframe, color-coded borders (purple=weekly, blue=daily, green=hourly), line chart + trendline overlay, bar count
- Pagination: 24 charts per page (15 tickers × 3 timeframes = 45 total on page 1)

#### WHY
Provides a 10,000-foot view. Instead of navigating to individual charts, the trader can scan all charts visually in a grid and quickly spot unusual patterns or signals. The Trading Signals panel surfaces the most recent automated signals across the entire watchlist.

#### HOW

**Trading Signals:**
- Stored in `trading_signals` table:
  ```sql
  CREATE TABLE trading_signals (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(10),
    timeframe   VARCHAR(10),
    signal_type VARCHAR(50),  -- 'divergence' | 'MACD_bullish' | 'oversold' | 'overbought' | 'proximity' | 'vix_entry'
    direction   VARCHAR(5),   -- 'bull' | 'bear'
    detail      TEXT,         -- e.g. "BUY @ $424.95 (stop $410.28)"
    signal_date DATE,
    days_ago    INT,          -- computed at query time
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ```

**Signal generation rules:**
- **RSI oversold:** RSI(14) < 30 on daily close
- **RSI overbought:** RSI(14) > 70
- **MACD bullish/bearish:** MACD line crosses signal line
- **Divergence:** Price makes lower low but RSI makes higher low (bullish), or vice versa
- **Proximity:** Price within 1×ATR of a trendline
- **VIX Entry:** Entry signal generated when Scanner zone = ENTRY; price + stop pre-calculated

**Mini Chart generation:**
- Backend pre-renders chart data as JSON (closing prices array + projected trendline slope) for each ticker/timeframe combo
- Frontend renders with a minimal canvas or SVG sparkline
- Endpoint: `GET /api/overview/charts?page=1&per_page=24`

**API Endpoints:**
```
GET /api/signals?limit=50          → recent trading signals
GET /api/overview/charts?page=1    → paginated chart thumbnail data
```

---

### 3.6 CATEGORIES Tab  
**Route:** `/categories?cat=mega-cap-tech`  
**Screenshot:** `screenshots/06-categories.png`

#### WHAT
- "Categories" with updated timestamp
- Category pill tabs: Index ETFs, Mega Cap Tech, Semiconductors, AI & Momentum, Financials, Energy, Healthcare & Biotech, Commodities, Fixed Income, International & Shipping
- "+ Add Ticker" button
- Table: Ticker, Price, Change ($), Change (%)

#### WHY
Monitors market breadth by sector. The trader needs to know which sectors are leading/lagging to make informed rotation decisions. Adding custom tickers to categories allows personalized grouping.

#### HOW

**Data Model:**
```sql
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL,
  slug  VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE category_tickers (
  category_id  INT REFERENCES categories(id),
  ticker       VARCHAR(10) NOT NULL,
  PRIMARY KEY (category_id, ticker)
);
```

**Real-time Prices:**
- Fetched via Alpaca latest quote or Polygon snapshot API
- Cached in Redis/in-memory for 60 seconds
- Change ($) and Change (%) computed against previous day's close from `bars` table

**Add Ticker flow:**
- `POST /api/categories/:slug/tickers` with body `{ ticker: "NVDA" }`
- Validates ticker exists in `bars` table before adding

**API Endpoints:**
```
GET    /api/categories                         → all categories with tickers
GET    /api/categories/:slug/prices            → current prices for category
POST   /api/categories/:slug/tickers           → add ticker
DELETE /api/categories/:slug/tickers/:ticker   → remove ticker
```

---

### 3.7 TASKS Tab  
**Route:** `/tasks`  
**Screenshot:** `screenshots/07-tasks.png`

#### WHAT
- Kanban board: columns TO-DO | In Progress | Done | On Hold | + Add list
- Each card: priority dot (red/yellow/green), title, description, category badge, attachment count, image preview
- "Deleted" view (trash)
- Column 3-dot menus, "+ Add a card" per column

#### WHY
Personal project management for tracking app development tasks, trade ideas, and feature improvements. The category badges (e.g. "Earning", "Categories") link tasks to specific app features.

#### HOW

**Data Model:**
```sql
CREATE TABLE task_lists (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100),
  position INT,
  deleted  BOOLEAN DEFAULT false
);

CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  list_id     INT REFERENCES task_lists(id),
  title       VARCHAR(255),
  description TEXT,
  priority    VARCHAR(10),  -- 'red' | 'yellow' | 'green'
  label       VARCHAR(50),
  position    INT,
  deleted     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_attachments (
  id        SERIAL PRIMARY KEY,
  task_id   INT REFERENCES tasks(id),
  filename  VARCHAR(255),
  url       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Endpoints:**
```
GET    /api/tasks                           → all lists with cards
POST   /api/tasks/lists                     → create list
PATCH  /api/tasks/lists/:id                 → rename/reorder
POST   /api/tasks                           → create card
PATCH  /api/tasks/:id                       → update card (move/edit)
DELETE /api/tasks/:id                       → soft delete
POST   /api/tasks/:id/attachments           → upload attachment image
GET    /api/tasks/deleted                   → deleted cards
```

**Drag & Drop:** Client-side with react-beautiful-dnd or dnd-kit; position field updated on drop.

---

### 3.8 NOTES Tab  
**Route:** `/notes`  
**Screenshot:** `screenshots/08-notes.png`

#### WHAT
- Two-panel layout: left sidebar (search + list of notes with timestamps) | right editor panel
- Search bar filters notes by title/content
- "+" button creates new note
- Delete icon per note in sidebar
- Note content: freeform rich text/markdown
- "Preview" toggle renders markdown

#### WHY
Trade journal and research notes. The trader needs a place to write pre-earnings analysis, trade theses, post-trade reviews. Keeping notes in-app (vs. external tool) means analysis lives alongside charts and signals.

#### HOW

**Data Model:**
```sql
CREATE TABLE notes (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255),
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Search:** Full-text search via PostgreSQL `tsvector` or simple `ILIKE` on title + content
**Markdown rendering:** Frontend-only, using marked.js or remark

**API Endpoints:**
```
GET    /api/notes               → all notes (title + preview + timestamp)
GET    /api/notes/:id           → full note content
POST   /api/notes               → create note
PATCH  /api/notes/:id           → update note
DELETE /api/notes/:id           → delete note
GET    /api/notes?q=ORCL        → search notes
```

---

### 3.9 PIPELINE Tab  
**Route:** `/pipeline`  
**Screenshot:** `screenshots/09-pipeline.png`

#### WHAT
- "Pipeline Status" with Refresh + Auto(15s) toggle
- **DATA FETCHERS** section: Weekly Bars, Daily Bars, Hourly Bars (progress bars), VIX Data, Earnings Calendar
- **TRENDLINE ENGINE** section: last analyzed ticker, Weekly/Daily/Hourly Trendlines with progress bars + idle/running status + "Show N missing" links
- **TRADING SIGNALS** section: Generated Signals with progress bar
- Each item shows: latest date, count/total, percentage, time since last run

#### WHY
Operational visibility. The trader needs to know if data is fresh before acting on signals. Stale trendlines or missing bar data could produce false signals. The pipeline view is the health dashboard for the entire backend system.

#### HOW

**Pipeline State Table:**
```sql
CREATE TABLE pipeline_status (
  id           SERIAL PRIMARY KEY,
  job_name     VARCHAR(50) UNIQUE NOT NULL,  -- 'weekly_bars' | 'daily_bars' etc.
  total        INT,
  completed    INT,
  latest_date  DATE,
  status       VARCHAR(20),  -- 'idle' | 'running' | 'error'
  last_run_at  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Jobs (cron-based, e.g. node-cron or Vercel Cron):**
- `weekly_bars_fetcher` — runs Mon pre-market, fetches new weekly bars for all tickers
- `daily_bars_fetcher` — runs Mon–Fri at 5pm ET
- `hourly_bars_fetcher` — runs Mon–Fri at 5pm ET (last 30 days)
- `vix_fetcher` — runs daily at 4:30pm ET
- `earnings_fetcher` — runs daily at 6am ET
- `trendline_engine` — runs after daily_bars_fetcher completes; processes tickers in queue
- `signal_generator` — runs after trendline_engine completes

**Status polling:** Frontend polls `GET /api/pipeline/status` every 15s when Auto is checked

**API Endpoints:**
```
GET  /api/pipeline/status           → all job statuses
POST /api/pipeline/refresh          → manually trigger status refresh
GET  /api/pipeline/missing?job=weekly_trendlines  → list missing tickers
```

---

## 4. Global Backend Requirements

### Authentication
- Single-user app — simple bearer token or session cookie
- No user registration flow needed

### Data Sources
| Data | Provider | Frequency |
|------|----------|-----------|
| OHLCV Bars (W/D/H) | Alpaca Markets API | Daily EOD + Weekly |
| VIX Index | CBOE via Yahoo Finance / Polygon | Daily |
| Earnings Calendar | Financial Modeling Prep / Alpaca | Daily |
| Real-time Quotes | Alpaca latest quote | Per request (cached 60s) |

### Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Supabase or Railway) |
| ORM | Drizzle ORM or Prisma |
| Cache | Redis (Upstash) or in-memory Map |
| Cron Jobs | Vercel Cron or node-cron |
| Chart Library | Lightweight Charts (TradingView) |
| Auth | NextAuth.js or simple JWT |
| Deployment | Vercel |

### Performance Requirements
- Chart page load: < 1s (pre-fetched bar data cached)
- Scanner refresh: < 2s (pre-computed results)
- Category prices: < 500ms (Redis cached)
- Pipeline status: real-time polling, 15s interval

---

## 5. Data Flow Summary

```
[Alpaca/Polygon API]
        ↓ (cron daily)
[bars table] → [Trendline Engine] → [trendlines table]
                                          ↓
                               [Signal Generator] → [trading_signals table]
                                          ↓
                               [Scanner Engine] → [scan_results table]
                                          ↓
                               [Watchlist Engine] → [watchlist_results table]
                                          ↓
                              [API Routes] → [Next.js Frontend]
```
