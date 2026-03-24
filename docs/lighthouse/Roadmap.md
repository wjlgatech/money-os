# Lighthouse — Development Roadmap
**Version:** 1.0  
**Date:** 2026-03-22  
**Methodology:** Iterative sprints, feature-complete milestones  

---

## Overview

The roadmap is organized into 4 phases covering ~6 months from scratch to feature parity with the current app, plus a Phase 5 for future enhancements. Each phase produces a working, shippable product increment.

```
Phase 1 │████████│ Foundation & Data Ingestion     Weeks 1–3
Phase 2 │████████│ Core Chart & Analysis Engine    Weeks 4–7
Phase 3 │████████│ Scanner, Watchlist & Signals    Weeks 8–10
Phase 4 │████████│ Productivity Tools & Polish     Weeks 11–14
Phase 5 │░░░░░░░░│ Future Enhancements             Weeks 15+
```

---

## Phase 1 — Foundation & Data Ingestion  
**Duration:** Weeks 1–3  
**Goal:** Working database, all raw data flowing, pipeline monitor live

### Milestone 1.1 — Project Scaffolding (Week 1)
- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Configure Tailwind CSS with dark theme (background: #0d0d0f, Geist font)
- [ ] Set up PostgreSQL database (Supabase)
- [ ] Set up Redis cache (Upstash)
- [ ] Define complete Drizzle ORM schema (all 12 tables)
- [ ] Run database migrations
- [ ] Create global Navbar component (all 9 tabs, active state highlighting)
- [ ] Configure Vercel deployment + environment variables

**Deliverable:** Deployed Next.js shell with nav, empty pages, connected DB

---

### Milestone 1.2 — Data Fetchers (Week 2)
- [ ] Implement Alpaca API client (`lib/fetchers/alpaca.ts`)
  - Authenticate with API key/secret
  - `fetchBars(ticker, timeframe, from, to)` function
  - Handle pagination for large bar counts
- [ ] Build `fetchDailyBars` job — iterates all 549 tickers, upserts to `bars`
- [ ] Build `fetchWeeklyBars` job
- [ ] Build `fetchHourlyBars` job (last 30 days only, due to volume)
- [ ] Build `fetchVix` job (Yahoo Finance or Polygon)
- [ ] Build `fetchEarnings` job (FMP API, next 30 days)
- [ ] Create ticker master list (549 tickers — S&P 500 + extras)
- [ ] Configure Vercel Cron jobs in `vercel.json`
- [ ] Implement `pipeline_status` update logic in each job

**Deliverable:** All raw data populating DB on schedule, pipeline table tracking progress

---

### Milestone 1.3 — Pipeline Tab (Week 3)
- [ ] Build `GET /api/pipeline/status` endpoint
- [ ] Build `GET /api/pipeline/missing?job=` endpoint
- [ ] Build Pipeline page UI:
  - Section headers (DATA FETCHERS, TRENDLINE ENGINE, TRADING SIGNALS)
  - Progress bars with color-coding per job
  - Latest date, count/total, % complete, time-since-run labels
  - idle/running/error status badges
  - "Show N missing" expandable link
  - Refresh button + Auto(15s) checkbox with polling
- [ ] Manual Refresh endpoint `POST /api/pipeline/refresh`

**Deliverable:** Fully functional Pipeline tab; can monitor all job statuses

---

## Phase 2 — Core Chart & Analysis Engine  
**Duration:** Weeks 4–7  
**Goal:** Chart tab working with bot trendlines, S/R levels, and human drawing

### Milestone 2.1 — Technical Indicators Library (Week 4)
- [ ] Implement `lib/indicators/atr.ts` — ATR(14) calculation
- [ ] Implement `lib/indicators/rsi.ts` — RSI(14) with Wilder's smoothing
- [ ] Implement `lib/indicators/macd.ts` — MACD(12,26,9)
- [ ] Implement `lib/indicators/zigzag.ts` — pivot high/low detection
- [ ] Write unit tests for all indicators
- [ ] Implement `lib/indicators/wpattern.ts` — W-shape pattern detector

**Deliverable:** Tested indicator library ready for engine consumption

---

### Milestone 2.2 — Trendline Engine (Week 5)
- [ ] Implement `lib/engine/trendlineEngine.ts`:
  - Input: OHLCV array for one ticker/timeframe
  - Step 1: Zigzag pivot detection (configurable lookback N=5)
  - Step 2: All pivot-pair line candidates
  - Step 3: Score each candidate (touches, recency, slope quality)
  - Step 4: Filter top-K lines (default K=5)
  - Step 5: Classify support vs resistance
  - Step 6: Compute slope, x1/x2/y1/y2 coordinates
- [ ] Build `runTrendlineEngine` job — processes all tickers in queue, updates pipeline status
- [ ] Implement line projection function: `projectLine(trendline, targetDate) → price`
- [ ] Build `GET /api/trendlines?ticker=` endpoint
- [ ] Build `POST /api/trendlines` (human line creation)
- [ ] Build `DELETE /api/trendlines/:id`

**Deliverable:** Trendlines computed and stored for all tickers; API serving them

---

### Milestone 2.3 — Chart Page (Weeks 6–7)
- [ ] Install and configure Lightweight Charts (TradingView)
- [ ] Build `CandlestickChart` component:
  - OHLCV series with green/red candles
  - Volume histogram in panel footer
  - Responsive to container dimensions
  - Synchronized time axis between Weekly and Daily panels
- [ ] Build `DrawingToolbar` component (Pointer, Trendline, Horizontal, Short Line)
- [ ] Implement canvas line drawing interaction (click-drag for trendlines)
- [ ] Build `SRLevelsOverlay` component — floating tooltip with S1/S2/R1/R2
- [ ] Implement `GET /api/sr-levels?ticker=` — projects all lines to current date, ranks by proximity
- [ ] Build `ChartLegend` component (W/D/Human/Bot/Conf color legend)
- [ ] Build status bar (lines count, conf count, S/R ratio, last price)
- [ ] Implement Fullscreen mode per panel
- [ ] Add W/D timeframe toggle buttons
- [ ] Wire up ticker search in navbar → URL param update → chart reload
- [ ] Build `GET /api/bars?ticker=&timeframe=` with Redis caching

**Deliverable:** Fully interactive Chart tab with 2 panels, trendlines, S/R overlay, drawing tools

---

## Phase 3 — Scanner, Watchlist, Signals & Earnings  
**Duration:** Weeks 8–10  
**Goal:** All market-scanning features live

### Milestone 3.1 — Scanner Engine & Tab (Week 8)
- [ ] Implement `lib/engine/scannerEngine.ts`:
  - Fetch latest closes, ATR(14), VIX for all tickers
  - Project all active trendlines to current date
  - Compute distance in ATR units and USD
  - Apply VIX-adjusted zone thresholds
  - Detect IX (intersection) type where weekly/daily lines converge within 0.5×ATR
  - Apply W Pattern filter pass
  - Store results to `scan_results` table
- [ ] Schedule `runScannerEngine` every 60 seconds
- [ ] Build `GET /api/scanner?filter=` endpoint
- [ ] Build Scanner page UI:
  - Stats cards (VIX, Vol Factor, Tickers Scanned, Matches, Updated)
  - Signal Types explanation box
  - Filter tab pills (All, Light, W Pattern, Trendline, Intersection, Entry Zone, Alert Zone)
  - Results table with all columns (Ticker, Price, Type badge, Level, Distance, Zone badge, Timeframes tags, Earnings)
  - Refresh button
  - Formula footer

**Deliverable:** Live scanner refreshing every 60s, full filter system

---

### Milestone 3.2 — Watchlist Tab (Week 9)
- [ ] Implement `lib/engine/watchlistEngine.ts`:
  - Extend proximity check to ±2×ATR(14)
  - Look for intersections within ±2 calendar weeks
  - Compute price range [close-2×ATR, close+2×ATR]
  - Determine BUY/SELL direction
- [ ] Build `GET /api/watchlist` endpoint
- [ ] Build Watchlist page UI:
  - Same stats cards as Scanner
  - "How This Works" explanation card
  - Results table (Ticker, Price, Intersection, Distance ATR, Range, Timeframes, DIR badge)
  - Refresh button

**Deliverable:** Watchlist tab showing approaching-confluence stocks

---

### Milestone 3.3 — Signals, Earnings & Overview (Week 10)
- [ ] Implement `lib/engine/signalEngine.ts`:
  - RSI oversold/overbought detection
  - MACD crossover detection  
  - Bullish/bearish divergence detection (price vs RSI)
  - Proximity signal (within 1×ATR of trendline)
  - VIX Entry signal with calculated entry + stop levels
- [ ] Build `runSignalGenerator` job (daily after trendline engine)
- [ ] Build `GET /api/signals?limit=50` endpoint
- [ ] Build Earnings page:
  - Fetch earnings + enrich with trendline projections
  - Table with Pre/Post badges, trendline level, % distance, S/R badges
  - Grouping by date with day-count badges
- [ ] Build Overview page:
  - Trading Signals panel (scrollable, emoji badges, timeframe tags, days-ago)
  - Mini Chart grid (4-col, paginated, sparkline charts with trendline)
  - Color-coded borders per timeframe (purple/blue/green)
  - Build `GET /api/overview/charts?page=` endpoint

**Deliverable:** Earnings, Overview, and all signal features complete

---

## Phase 4 — Productivity Tools & Polish  
**Duration:** Weeks 11–14  
**Goal:** Tasks, Notes, Categories complete; full UI polish

### Milestone 4.1 — Categories Tab (Week 11)
- [ ] Seed database with 10 default categories and their tickers
- [ ] Build `GET /api/categories` and `GET /api/categories/:slug/prices`
- [ ] Implement real-time price fetching with 60s Redis cache
- [ ] Build Categories page:
  - Pill tab navigation (URL param update on click)
  - "+ Add Ticker" button with search dialog
  - Table (Ticker, Price, Change $, Change %) with color-coded changes
  - Updated timestamp
- [ ] Build `POST /api/categories/:slug/tickers` + DELETE endpoint

**Deliverable:** Categories tab with real-time sector price monitoring

---

### Milestone 4.2 — Tasks Kanban (Week 12)
- [ ] Seed default task lists (TO-DO, In Progress, Done, On Hold)
- [ ] Build all Task API endpoints (CRUD for lists + cards + attachments)
- [ ] Build Kanban board UI:
  - Horizontal scrollable column layout
  - Drag-and-drop reordering (dnd-kit)
  - Card component with priority dot, title, description, label badge, attachment count
  - Image attachment preview on card
  - "+ Add a card" inline form
  - "···" column menu (rename, delete)
  - "+ Add list" column
  - Deleted items view
- [ ] Image upload for attachments (Vercel Blob or S3)

**Deliverable:** Full Kanban board with drag-and-drop

---

### Milestone 4.3 — Notes (Week 13)
- [ ] Build all Notes API endpoints (CRUD + search)
- [ ] Build Notes page:
  - Two-panel layout (sidebar + editor)
  - Sidebar: search input, note list (title + timestamp + preview), delete button
  - Editor: contenteditable or textarea for markdown input
  - Preview toggle (renders markdown via marked.js)
  - "+ New Note" button
  - Auto-save on keystroke (debounced 1s)

**Deliverable:** Full notes app with markdown preview and search

---

### Milestone 4.4 — Polish & QA (Week 14)
- [ ] Consistent loading skeleton states for all tables (match app's dark skeleton rows)
- [ ] Error boundary components for all pages
- [ ] Empty state UI for scanner/watchlist (no results)
- [ ] Mobile-responsive layout (tablet support minimum)
- [ ] Consistent color tokens in Tailwind config
- [ ] Add "Signal Alerts Guide" page (`/signals-info`)
- [ ] Footer "Lighthouse v0.5.0" on all pages
- [ ] Performance audit: < 1s chart load, < 2s scanner load
- [ ] API error handling + retry logic for external fetchers
- [ ] Rate limit protection on Alpaca API calls
- [ ] End-to-end testing of cron flow (fetch → trendlines → signals → scanner)
- [ ] Verify all 9 navigation tabs functional

**Deliverable:** Production-ready app matching current live version

---

## Phase 5 — Future Enhancements  
**Timeline:** Post Week 14 (backlog)

### 5.1 Real-time Data
- [ ] WebSocket connection for live price streaming (Alpaca WS API)
- [ ] Live scanner updates pushed via Server-Sent Events

### 5.2 Alerts & Notifications
- [ ] Email/SMS alert when a ticker enters Entry Zone
- [ ] Daily morning digest email with top scanner signals
- [ ] Telegram bot integration

### 5.3 Advanced Analytics
- [ ] Backtesting module: test entry/alert zone signal performance
- [ ] Trade log: record actual trades, track P&L
- [ ] Win rate statistics per signal type

### 5.4 Chart Enhancements
- [ ] Third chart panel for Hourly timeframe
- [ ] Volume profile overlay
- [ ] Fibonacci retracement drawing tool
- [ ] Multi-ticker comparison view

### 5.5 AI Features
- [ ] LLM-generated chart commentary (GPT-4 Vision analyzing chart screenshot)
- [ ] Automated pre-earnings research brief generation
- [ ] Pattern recognition confidence scoring

---

## Sprint Planning Template

Each sprint = 1 week. Recommended team: 1 full-stack developer.

```
Weekly Sprint Structure:
Mon: Planning + schema/API work
Tue-Wed: Backend implementation
Thu: Frontend implementation
Fri: Integration testing + deployment
```

---

## Definition of Done

A feature is "done" when:
1. API endpoint returns correct data (tested with curl/Postman)
2. UI renders correctly in dark theme
3. Loading/error states implemented
4. No TypeScript errors
5. Deployed to Vercel preview
6. Matches visual appearance of reference screenshots

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Alpaca API rate limits (200 req/min) | High | High | Batch requests, add delays between tickers, use bulk endpoints |
| Trendline engine taking > 20min for 549 tickers | Medium | Medium | Process in batches of 50, use parallel workers |
| Vercel serverless function 60s timeout | Medium | High | Move heavy jobs to Vercel Edge or a persistent Node.js server |
| External API pricing changes | Low | Medium | Abstract fetcher layer to swap providers |
| Database connection pool exhaustion | Low | High | Use connection pooling (PgBouncer), limit to 10 connections |
