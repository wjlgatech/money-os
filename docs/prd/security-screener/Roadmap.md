# Security Screener — Development Roadmap
**Version:** 1.0
**Date:** 2026-03-22
**Parent system:** Money OS v3.1+

---

## Overview

Three phases. Each produces something usable. The first phase delivers the core value (portfolio-aware scanning) in 3 weeks. Phase 2 adds crypto and fundamentals. Phase 3 adds the intelligence that makes this more than a chart tool.

```
Phase 1 │████████│ Core Screening Engine         Weeks 1–3
Phase 2 │████████│ Crypto + Fundamentals         Weeks 4–6
Phase 3 │████████│ Portfolio Intelligence Layer   Weeks 7–9
Phase 4 │░░░░░░░░│ Future Enhancements           Weeks 10+
```

**Difference from Lighthouse's roadmap:** Lighthouse builds a full web app with 9 tabs over 14 weeks. We build a data service + Claude skill in 9 weeks. No Kanban board, no notes app, no hourly bars, no human drawing tools. Every week ships something that makes `/screen` smarter.

---

## Phase 1 — Core Screening Engine
**Duration:** Weeks 1–3
**Goal:** Scanner finds stocks near trendlines, Claude presents them with portfolio context

This phase is the minimum viable loop: data in → trendlines computed → scan results out → Claude filters by portfolio.

### Milestone 1.1 — Data Service Scaffold (Week 1)

- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Configure Supabase PostgreSQL + Drizzle ORM
- [ ] Define schema: `bars`, `trendlines`, `scan_results`, `trading_signals`, `watched_tickers`, `pipeline_status`
- [ ] Run migrations
- [ ] Configure Vercel deployment + environment variables
- [ ] Implement Alpaca API client (`lib/fetchers/alpaca.ts`)
  - `fetchBars(ticker, timeframe, from, to)` with pagination
- [ ] Build `fetchDailyBars` cron job — iterate watched tickers, upsert to `bars`
- [ ] Build `fetchWeeklyBars` cron job
- [ ] Build `fetchVix` cron job
- [ ] Seed `watched_tickers` with S&P 500
- [ ] Configure Vercel Cron in `vercel.json`
- [ ] Build `GET /api/pipeline/status` endpoint

**Deliverable:** Data service deployed, market data flowing daily, pipeline status visible.

---

### Milestone 1.2 — Trendline + Scanner Engines (Week 2)

- [ ] Implement `lib/indicators/atr.ts` — ATR(14)
- [ ] Implement `lib/indicators/rsi.ts` — RSI(14)
- [ ] Implement `lib/indicators/macd.ts` — MACD(12,26,9)
- [ ] Implement `lib/indicators/zigzag.ts` — pivot detection
- [ ] Write unit tests for all indicators
- [ ] Implement `lib/engine/trendlineEngine.ts`:
  - Zigzag pivot detection → line candidates → scoring → top-K → classify S/R
- [ ] Build `runTrendlineEngine` cron job (processes all watched tickers, weekly + daily)
- [ ] Implement `lib/engine/scannerEngine.ts`:
  - VIX-adjusted ATR zones (Entry/Alert)
  - Intersection detection (weekly + daily convergence)
- [ ] Build `runScannerEngine` cron job (runs after trendline engine)
- [ ] Build API endpoints:
  - `GET /api/bars?ticker=&timeframe=`
  - `GET /api/trendlines?ticker=`
  - `GET /api/sr-levels?ticker=`
  - `GET /api/scanner?filter=`
  - `GET /api/vix`

**Deliverable:** Trendlines and scan results computed daily for all watched tickers. API serving results.

---

### Milestone 1.3 — Claude Skill + Portfolio Integration (Week 3)

- [ ] Create `skills/security-screener/SKILL.md` with:
  - `/screen` command: fetch scan results → read profile → apply portfolio filter → format output
  - `/watchlist` command: fetch approaching-zone stocks → overlay portfolio context
  - `/signals` command: fetch recent signals → prioritize by portfolio relevance
- [ ] Create `commands/screen.md`, `commands/watchlist-scan.md`, `commands/signals.md`
- [ ] Implement portfolio filtering logic in skill instructions:
  - Sector allocation gap scoring
  - Position sizing (1-3% of portfolio)
  - Concentration warnings (sector >5% over target)
- [ ] Implement `lib/engine/signalEngine.ts`:
  - RSI oversold/overbought
  - MACD crossover
  - Divergence detection
  - Proximity signal
- [ ] Build `runSignalGenerator` cron job
- [ ] Build `GET /api/signals?limit=50&ticker=` endpoint
- [ ] Build `POST /api/universe/sync` endpoint (accepts ticker list from Claude)
- [ ] Integration test: full flow from `/screen` command to portfolio-filtered output
- [ ] Update `commands/money-os.md` router to include new commands

**Deliverable:** User can say `/screen` and get portfolio-aware investment candidates. Full loop working.

---

## Phase 2 — Crypto + Fundamentals
**Duration:** Weeks 4–6
**Goal:** Crypto assets in the scanner, fundamental data enriching every recommendation

### Milestone 2.1 — Crypto Support (Week 4)

- [ ] Implement CoinGecko API client (`lib/fetchers/coingecko.ts`)
  - `fetchDailyBars(coinId)` — OHLCV for top 20 coins
  - `fetchWeeklyBars(coinId)` — aggregate from daily
- [ ] Build `cryptoBarsFetcher` cron job (daily midnight UTC)
- [ ] Seed `watched_tickers` with top 20 crypto by market cap
- [ ] Extend trendline engine to handle crypto tickers (24/7 market, UTC daily close)
- [ ] Extend scanner engine for crypto (no VIX adjustment for crypto — use BTC volatility index or fixed factor)
- [ ] Update skill to handle crypto in `/screen` output (no P/E for crypto, show network metrics where available)

**Deliverable:** `/screen` returns crypto candidates alongside stocks.

---

### Milestone 2.2 — Fundamental Data (Week 5)

- [ ] Implement FMP API client (`lib/fetchers/fmp.ts`)
  - `fetchFundamentals(ticker)` — quarterly key ratios
  - `fetchEarningsCalendar(days)` — upcoming earnings
- [ ] Create `fundamentals` table, run migration
- [ ] Build `fundamentalsFetcher` cron job (daily 6:30 AM)
- [ ] Build `earningsFetcher` cron job (daily 6:00 AM)
- [ ] Extend `scan_results` to include fundamental overlay (P/E, rev growth, sector)
- [ ] Build API endpoints:
  - `GET /api/fundamentals?ticker=`
  - `GET /api/earnings?days=7`
- [ ] Update scanner engine to attach fundamental data to scan results

**Deliverable:** Scan results include fundamental quality metrics. Earnings calendar available.

---

### Milestone 2.3 — Earnings + Sectors (Week 6)

- [ ] Create `skills/security-screener/` reference docs for earnings interpretation
- [ ] Add `/earnings` command to skill:
  - Fetch earnings calendar → enrich with trendline proximity → filter by portfolio
  - Flag stocks the user owns that are reporting
  - Note trendline levels as "lines in the sand" for earnings reactions
- [ ] Add `/sectors` command to skill:
  - Fetch sector performance from category price data
  - Map to user's allocation targets
  - Generate rotation signals (lagging + underweight = opportunity)
- [ ] Create `sectors` and `sector_tickers` tables
- [ ] Seed with 10 default sectors (same as Lighthouse's categories but with allocation context)
- [ ] Build `GET /api/sectors` and `GET /api/sectors/:slug/prices`
- [ ] Update commands/money-os.md router

**Deliverable:** Full feature set live: `/screen`, `/watchlist`, `/signals`, `/earnings`, `/sectors`.

---

## Phase 3 — Portfolio Intelligence Layer
**Duration:** Weeks 7–9
**Goal:** The screener becomes truly personal — it learns your thesis, suggests based on conviction, and connects to the full Money OS skill chain

### Milestone 3.1 — Thesis-Aware Screening (Week 7)

- [ ] Extend `/screen` to accept thesis context:
  - If `profile/history.md` contains a prior `/thesis-to-trades` analysis, use its categories and conviction levels to weight scan results
  - "Aligned with thesis" filter: only show candidates that map to thesis categories
  - Score candidates by thesis alignment × technical quality × fundamental quality × portfolio fit
- [ ] Build thesis-ticker mapping: when a thesis names sectors/themes, map to specific tickers in the universe
- [ ] Add "thesis score" to `/screen` output (how well each candidate fits the stated thesis)

**Deliverable:** `/screen` results are weighted by thesis conviction, not just technical proximity.

---

### Milestone 3.2 — Tax-Aware Recommendations (Week 8)

- [ ] Extend `/screen` position sizing to consider funding sources:
  - When recommending a buy, suggest which existing position to trim
  - Check holding periods from `profile/holdings.md` — flag short-term vs long-term gains
  - Estimate tax impact: "Trimming MSFT (long-term, 15% rate) frees $2,400. Trimming AMZN (short-term, 32% rate) costs $380 more in taxes."
- [ ] Integrate with `/rebalance` skill: `/screen` output includes a "generate trade plan" CTA that feeds directly into rebalancing
- [ ] Add wash-sale detection: if user recently sold a ticker at a loss, warn before recommending re-entry within 30 days

**Deliverable:** Recommendations include tax-optimized funding sources and wash-sale warnings.

---

### Milestone 3.3 — Quality Scoring + Backtesting Foundation (Week 9)

- [ ] Implement composite quality score for scan results:
  - Technical score (0-100): zone proximity + signal confluence + trendline touches
  - Fundamental score (0-100): valuation vs sector average + growth + margins
  - Portfolio score (0-100): fills allocation gap + thesis alignment + diversification benefit
  - Overall score = weighted average (configurable weights)
- [ ] Build historical signal tracking:
  - When a signal fires, record the outcome 5/10/20 days later
  - Store in `signal_outcomes` table
  - Begin accumulating win-rate data per signal type
- [ ] Add signal quality metadata to `/signals` output:
  - "RSI oversold signals on daily have led to 5-day bounces 68% of the time in your universe"
- [ ] Build `GET /api/signals/performance` endpoint

**Deliverable:** Scored recommendations with early backtesting data. Foundation for Money OS M5 (Learning System).

---

## Phase 4 — Future Enhancements
**Timeline:** Post Week 9 (backlog, prioritized by user demand)

### 4.1 Optional Web Dashboard
- [ ] Minimal chart viewer for scan results (Lightweight Charts)
- [ ] Scanner results table with sorting/filtering
- [ ] Not a full Lighthouse clone — just a visual companion to the Claude skill
- [ ] Single-page, read-only, pulls from same API

### 4.2 Alert System
- [ ] Email digest: daily summary of entry zone stocks + portfolio-relevant signals
- [ ] Telegram bot: real-time alerts for high-conviction entry signals
- [ ] Alert preferences stored in user profile

### 4.3 Advanced Patterns
- [ ] W-pattern detection (from Lighthouse — deferred from Phase 1 for simplicity)
- [ ] Volume profile analysis
- [ ] Relative strength vs. sector (is the stock leading or lagging its peers?)

### 4.4 Expanded Asset Coverage
- [ ] International ADRs (emerging market exposure)
- [ ] Bond ETFs (for fixed income allocation)
- [ ] Commodity ETFs (gold, oil, agriculture)
- [ ] REITs (real estate exposure)

### 4.5 AI Enhancements
- [ ] LLM-generated chart commentary (describe what the chart "looks like" in plain language)
- [ ] Earnings preview briefs (pre-earnings research summary from web search)
- [ ] Pattern recognition confidence scoring

---

## Sprint Structure

Each sprint = 1 week. Single developer.

```
Mon:    Planning + schema/API design
Tue-Wed: Backend (fetchers, engines, cron jobs)
Thu:     Skill writing + integration
Fri:     Testing + deployment + skill validation with real data
```

---

## Definition of Done

A milestone is done when:
1. All API endpoints return correct data (tested with curl)
2. Cron jobs execute on schedule and pipeline status shows green
3. Claude skill produces correct, portfolio-aware output for test scenarios
4. No TypeScript errors
5. Deployed to Vercel
6. End-to-end: user says `/screen` → gets relevant, filtered results with position sizing

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Alpaca API rate limits (200 req/min) | High | High | Batch requests, stagger fetches, use bulk endpoints where available |
| CoinGecko free tier limits (30 req/min) | Medium | Medium | Cache aggressively, fetch only top 20 coins, consider Pro tier |
| FMP free tier (250 req/day) | High | Medium | Fetch fundamentals weekly not daily, cache in DB, prioritize portfolio tickers |
| Trendline engine >20 min for full universe | Medium | Medium | Process in batches of 50, parallelize where Vercel allows |
| Vercel serverless 60s timeout | Medium | High | Split heavy jobs into smaller cron-triggered chunks |
| Stale data producing false signals | Low | High | Pipeline status monitoring, skill checks data freshness before presenting results |
| User profile out of date | Medium | Medium | Skill prompts user to verify holdings if last update >30 days |

---

## Comparison: Our Roadmap vs. Lighthouse's

| Dimension | Lighthouse (14 weeks) | Ours (9 weeks) |
|---|---|---|
| Scope | Full standalone web app, 9 tabs | Data service + Claude skill, 5 commands |
| Assets | 549 stocks only | Stocks + crypto + ETFs, dynamic universe |
| Intelligence | Technical analysis only | Technical + fundamental + portfolio + tax |
| Personalization | None (same view for everyone) | Filtered by holdings, thesis, allocation targets |
| Productivity tools | Kanban + Notes (4 weeks) | None (use existing tools) |
| Hourly data | Yes (expensive) | No (irrelevant for personal investing) |
| Real-time scanning | Every 60 seconds | Once daily post-market |
| UI | Full dark-theme dashboard | Claude conversation (optional minimal dashboard later) |
| Integration | Standalone | Feeds into /thesis-to-trades, /decide, /rebalance |
