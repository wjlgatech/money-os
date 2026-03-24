# Security Screener — Product Requirements Document
**Version:** 1.0
**Date:** 2026-03-22
**Parent system:** Money OS v3.1+

---

## 1. Product Overview

The Security Screener is the missing link in Money OS. Today, Money OS can tell you what's wrong with your portfolio (`/portfolio-check`), what your thesis demands (`/thesis-to-trades`), and what macro risks are elevated (`/macro-check`). But when the answer is "buy something" — it goes silent. The user has to leave Money OS, open a separate tool, find candidates, then come back.

The Security Screener closes that loop. It answers: **"Given my thesis, my portfolio, and current market conditions — what should I be looking at right now, and why?"**

It does this by combining Lighthouse's proven technical analysis engine (trendline detection, VIX-adjusted scanning, signal generation) with Money OS's portfolio intelligence (holdings, thesis, tax situation, goals). The technical layer finds *what's interesting in the market*. The portfolio layer filters it down to *what's interesting for you*.

---

## 2. Goals & Non-Goals

### Goals
- Surface investment candidates that are technically attractive (near support/resistance, signal confluence) AND fundamentally sound (reasonable valuation, growing revenue)
- Filter candidates through the user's portfolio context (thesis alignment, sector exposure, tax timing)
- Provide position sizing recommendations grounded in the user's actual portfolio size and allocation targets
- Cover stocks, ETFs, and top crypto assets in a unified screening experience
- Deliver early warnings for stocks approaching key levels (watchlist) and earnings catalysts
- Integrate seamlessly with existing Money OS skills — screener output feeds directly into `/thesis-to-trades`, `/decide`, and `/rebalance`

### Non-Goals
- No order execution (that's M4 scope in Money OS's roadmap)
- No real-time streaming or intraday analysis (daily EOD is the fastest cadence)
- No AI-generated investment theses (the user provides the thesis; we find candidates that fit it)
- No social features, leaderboards, or copy-trading
- No mobile app (Claude plugin + optional web dashboard)
- No options or derivatives screening (stocks, ETFs, crypto only)

---

## 3. Feature Specification

---

### 3.1 `/screen` — Security Scanner

**Trigger phrases:** "scan for stocks", "find me opportunities", "what's near support", "screen for value", "crypto near entry", "show me entry zones"

#### What the User Gets

A filtered list of securities near technically significant levels, enriched with fundamental data and filtered through their portfolio context.

Example output:
```
SECURITY SCAN — 2026-03-22 (Post-market)

Market Context: VIX 18.4 (normal) │ Vol Factor 0.92 │ 247 tickers scanned │ 12 in zone

YOUR PORTFOLIO CONTEXT:
Tech: 38% (target 30%) │ Healthcare: 5% (target 12%) │ Crypto: 8% (target 10%)

─── ENTRY ZONE (3) ──────────────────────────────────────────────────

QCOM │ $187.42 │ Weekly support │ 0.3 ATR away │ ENTRY
  Fundamentals: P/E 14.2 │ Rev +22% YoY │ Margin 28%
  Portfolio fit: No current exposure. Diversifies within tech (chips vs. software).
  Thesis: Aligns with AI-infrastructure layer.
  Position size: $2,400 (1.5% of portfolio)
  ⚠️ Tech already overweight — this adds to concentration.

UNH │ $521.08 │ Daily support + Weekly confluence │ 0.1 ATR │ ENTRY
  Fundamentals: P/E 21.3 │ Rev +11% YoY │ Margin 6.2%
  Portfolio fit: Healthcare at 5% vs. 12% target. High priority gap.
  Thesis: Defensive healthcare — macro radar shows elevated recession risk.
  Position size: $4,800 (3% of portfolio, brings healthcare to 8%)
  ✅ Fills underweight sector. Strong technical + fundamental + portfolio fit.

SOL │ $142.80 │ Weekly support │ 0.5 ATR │ ENTRY
  Fundamentals: N/A (crypto) │ Network TVL +45% QoQ
  Portfolio fit: Crypto at 8% vs 10% target. Room to add.
  Position size: $1,600 (1% of portfolio)

─── ALERT ZONE (9) ─── [showing top 3 by portfolio relevance]

AMGN │ $298.15 │ 1.1 ATR from weekly support │ ALERT
  Watching for: Drop below $290 enters ENTRY zone.
  Portfolio fit: Healthcare gap filler. Earnings Apr 2.

[... 6 more ...]

RECOMMENDATION PRIORITY:
1. UNH — strongest combined score (technical + fills biggest portfolio gap)
2. SOL — small position, fills crypto underweight
3. QCOM — quality name but adds to overweight sector

Use /decide UNH to model scenarios, or /rebalance to generate the full trade plan.
```

#### How It Works

1. **Fetch scan results** from data service: `GET /api/scanner?filter=entry,alert`
2. **Read `profile/holdings.md`** — current positions and allocations
3. **Read `profile/goals.md`** — target allocations by sector/asset class
4. **Read `profile/financial-identity.md`** — tax bracket, holding periods
5. **Apply portfolio filter:**
   - Score each candidate by: technical quality (zone + signal count) × fundamental quality (valuation + growth) × portfolio fit (fills a gap vs. adds to overweight)
   - Remove candidates that would push any sector >5% over target (unless user explicitly requests)
   - Flag tax implications of funding sources
6. **Position sizing:**
   - Default: 1-3% of total portfolio per new position
   - Adjusted by conviction: ENTRY zone + fills gap = 3%, ALERT zone = 1%
   - Never suggest a single position >5% of portfolio
7. **Output** with clear priority ranking and next-step commands

#### API Dependencies

```
GET /api/scanner?filter=entry,alert&asset=stock,crypto
GET /api/fundamentals?ticker=QCOM,UNH,SOL
GET /api/vix
```

---

### 3.2 `/watchlist` — Early Warning System

**Trigger phrases:** "what's approaching", "watchlist", "early warnings", "what should I watch this week"

#### What the User Gets

Securities that are 1-2 sessions away from entering the scanner's entry/alert zones. The "heads up before the action" view.

```
WATCHLIST — 2026-03-22

Approaching your zones in ~1-5 trading days:

APPROACHING SUPPORT (4):
MSFT │ $412.30 │ Weekly support at $405 │ 1.8 ATR away │ ~2 days at current pace
  You own 15 shares ($6,185). This would be an add-to-winner opportunity.
  Earnings: Apr 24 (32 days). Consider waiting for earnings if adding.

[...]

APPROACHING RESISTANCE (2):
NVDA │ $892.15 │ Weekly resistance at $910 │ 0.8 ATR away │ ~1 day
  You own 8 shares ($7,137). If rejected at resistance, consider trimming.
  Held 14 months — long-term gains rate applies.

[...]
```

#### How It Works

Same as Lighthouse's watchlist algorithm (close ± 2×ATR reaches a trendline intersection within ±2 weeks), but with portfolio overlay:
- Flag securities the user already owns (add-to-winner vs. take-profit decisions)
- Note holding period for tax implications on sells
- Reference upcoming earnings as timing consideration

---

### 3.3 `/signals` — Technical Signal Feed

**Trigger phrases:** "any signals today", "technical alerts", "what fired", "RSI signals", "divergence alerts"

#### What the User Gets

Recent technical signals across the user's universe, prioritized by portfolio relevance.

```
SIGNALS — Last 7 days

🟢 BULLISH
  QCOM │ RSI oversold (28.4) on daily │ 2 days ago
    Near weekly support — potential double confirmation.
  SOL  │ MACD bullish crossover on daily │ today
    First bullish cross in 3 weeks.

🔴 BEARISH
  TSLA │ Bearish divergence (price ↑, RSI ↓) on weekly │ 3 days ago
    You own 5 shares. Watch for breakdown below $245 support.

⚪ NEUTRAL
  AAPL │ Proximity signal — within 1 ATR of daily resistance │ today
    You own 20 shares. Resistance at $198 has held 3 times.
```

Signal types (same as Lighthouse — proven set):
- RSI(14) oversold (<30) / overbought (>70)
- MACD(12,26,9) bullish/bearish crossover
- Bullish/bearish divergence (price vs RSI)
- Proximity to trendline (within 1×ATR)
- VIX Entry signal (scanner zone = ENTRY + calculated entry/stop)

---

### 3.4 `/earnings` — Catalyst Calendar

**Trigger phrases:** "upcoming earnings", "who reports this week", "earnings near support"

#### What the User Gets

Earnings calendar for the next 7-30 days, enriched with trendline proximity data, filtered to the user's universe.

```
EARNINGS — Next 7 Days

── Mon Mar 24 (2 reports in your universe) ──

LULU │ Post-market │ $385.20
  Weekly support at $372 (3.4% below) │ Type: SUP
  You own 8 shares. Consider: if earnings disappoint, $372 is the line.

── Wed Mar 26 (1 report) ──

MU │ Post-market │ $98.45
  Weekly resistance at $102 (3.6% above) │ Type: RES
  Aligns with semiconductor thesis. If beats + breaks $102, consider entry.
```

Same as Lighthouse's earnings enrichment, but filtered to user's watchlist/portfolio and annotated with portfolio context.

---

### 3.5 `/sectors` — Sector Health Monitor

**Trigger phrases:** "sector check", "how are sectors doing", "rotation signals", "sector performance"

#### What the User Gets

Sector-level performance dashboard showing which sectors are leading/lagging, mapped to the user's allocation.

```
SECTOR HEALTH — 2026-03-22

Sector          │ 1D     │ 1W     │ Your %  │ Target  │ Gap
────────────────┼────────┼────────┼─────────┼─────────┼──────
Technology      │ +0.8%  │ +2.1%  │ 38%     │ 30%     │ +8% ⚠️
Healthcare      │ -0.3%  │ -1.2%  │ 5%      │ 12%     │ -7% ⚠️
Energy          │ +1.2%  │ +3.8%  │ 4%      │ 8%      │ -4%
Crypto          │ +2.1%  │ -0.5%  │ 8%      │ 10%     │ -2%
[...]

ROTATION SIGNAL: Healthcare lagging + you're underweight.
  Entry zone stocks in healthcare: UNH, AMGN (see /screen)
```

Replaces Lighthouse's Categories tab. Instead of just showing prices, it maps sector performance to portfolio allocation gaps and generates rotation signals.

---

## 4. Ticker Universe Management

Lighthouse hardcodes 549 tickers. We make it dynamic.

**Three sources feed the universe:**

1. **Portfolio sync** — Every ticker in `profile/holdings.md` is automatically in the universe. You always get signals for stocks you own.

2. **Thesis tickers** — When `/thesis-to-trades` identifies tickers from a thesis, they're added to the universe. Your investment ideas get watched automatically.

3. **Manual watchlist** — User can add/remove tickers via the data service or by telling Claude "add PLTR to my watchlist."

**Default seed:** S&P 500 + top 20 crypto by market cap + any tickers in the user's profile. Estimated ~550 tickers, similar to Lighthouse but personalized.

---

## 5. Data Flow

```
[Alpaca]──────┐
[CoinGecko]───┤  Cron (daily post-market)
[FMP]─────────┤
[CBOE/Yahoo]──┘
       │
       ▼
   [bars + fundamentals + earnings + vix]
       │
       ▼
   [Trendline Engine]  →  [trendlines]
       │
       ▼
   [Signal Generator]  →  [trading_signals]
       │
       ▼
   [Scanner Engine]    →  [scan_results] (with fundamental overlay)
       │
       ▼
   [API Routes]  ←──── Claude reads via WebFetch or tool
       │
       ▼
   [Security Screener Skill]
       │
       ├── Reads profile/holdings.md (portfolio context)
       ├── Reads profile/goals.md (allocation targets)
       ├── Reads profile/financial-identity.md (tax context)
       │
       ▼
   [Portfolio-filtered, position-sized recommendations]
       │
       ├── → /thesis-to-trades (align with thesis)
       ├── → /decide (model scenarios)
       └── → /rebalance (generate trade plan)
```

---

## 6. Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Scanner API response | < 500ms | Pre-computed results, Redis cached |
| Fundamentals API response | < 200ms | Simple DB lookup |
| Full `/screen` skill response | < 15s | Includes Claude thinking + API calls + portfolio analysis |
| Data freshness | Bars updated by 6 PM ET daily | Signals are only as good as the data |
| Trendline engine | < 20 min for full universe | Must complete before signal generator runs |

---

## 7. How This Fits Money OS's Existing Roadmap

The Security Screener maps to **M3 (Portfolio Intelligence and Advisor)** in Money OS's roadmap. It doesn't require M2 (live broker connectors) — it works with manually-maintained `profile/holdings.md` data. It doesn't require M4 (execution) — it recommends, it doesn't trade.

It fills the gap between M2 and M3 by adding the *market-facing* intelligence that Money OS currently lacks. Today Money OS is introspective (it looks at your portfolio). The screener makes it extrospective (it looks at the market through the lens of your portfolio).

```
BEFORE:                              AFTER:
Thesis → ??? → Holdings              Thesis → /screen → /decide → Holdings
         ↑                                      ↑
    (user leaves Money OS               (stays in Money OS)
     to find candidates)
```

---

## 8. Success Metrics

- **Closed loop rate:** % of `/screen` results that lead to a `/decide` or `/rebalance` action (target: >30%)
- **Signal relevance:** % of surfaced candidates that the user engages with (clicks, asks about, or acts on) vs. ignores (target: >50%)
- **Portfolio fit accuracy:** % of position sizing recommendations the user accepts without manual adjustment (target: >70%)
- **Data freshness:** % of trading days where all pipeline jobs complete on schedule (target: >95%)
