---
name: security-screener
description: >
  Find investment candidates near technically significant levels, filtered through
  your portfolio context. Use when the user says "scan for stocks", "find me
  opportunities", "what's near support", "screen for value", "show me entry zones",
  "watchlist", "what's approaching", "any signals today", "technical alerts",
  or asks about finding new investment candidates.
version: 0.1.0
tools:
  - WebFetch
  - Read
---

# Security Screener

Find stocks and crypto near technically significant levels, then filter through your portfolio to show what actually matters to you.

## Beginner Detection

If the user seems new to investing (says things like "I'm new", "what does this mean", "I don't understand stocks", "where do I start", "how do I invest"), switch to beginner mode:

1. **Never assume they know jargon.** Replace "support level" with "a price floor where buyers historically step in." Replace "RSI oversold" with "the stock has been beaten down hard — might be a bargain."
2. **Lead with the decision, not the data.** Instead of "NVDA is 0.3 ATR from weekly support", say "NVDA is on sale near a price that has held 3 times in the past year. That's interesting."
3. **Always explain what to do next.** Every result should end with a clear action: "Research this company", "Watch this for a week", "Skip this — too risky for beginners."
4. **Guide them through the flowchart:**
   - Have cash to invest? → `/screen` (what's attractive right now?)
   - Already own stocks? → `/signals` (what's happening to your stuff?)
   - Just learning? → `/watchlist` (watch without risking anything)

5. **Use the signal translation table:**
   - RSI oversold → "Beaten down hard — potential bargain OR falling knife"
   - RSI overbought → "Bought aggressively — party might be ending"
   - MACD bullish → "Momentum shifting upward — tide is turning"
   - MACD bearish → "Momentum shifting downward — pay attention"
   - Bullish divergence → "Hidden buying while everyone panics"
   - Bearish divergence → "Hidden selling while everyone celebrates"
   - Proximity → "Price at a decision point — something's about to happen"

## API Configuration

Base URL: `http://localhost:3001` (local development) or the user's deployed Vercel URL.

All endpoints return JSON. No authentication required in development mode.

## Commands

### /screen — Find Investment Candidates

Fetch scanner results, overlay portfolio context, and present prioritized candidates.

**Steps:**

1. Fetch scan results:
   - WebFetch `GET {API_BASE}/api/scanner?filter=entry,alert`
   - WebFetch `GET {API_BASE}/api/vix` for market context

2. Read the user's portfolio (if it exists):
   - Read `profile/holdings.md` for current positions and allocations
   - Read `profile/goals.md` for target allocations by sector
   - Read `profile/financial-identity.md` for tax bracket and holding periods

3. For each scan result, compute:
   - **Portfolio fit**: Does this fill a sector gap? Is the user underweight here?
   - **Concentration risk**: Would adding this push any sector >5% beyond target?
   - **Position size**: 1-3% of total portfolio. ENTRY zone + fills gap = 3%. ALERT zone = 1%.
   - **Tax context**: If a buy requires selling something else, note holding period.

4. Present results in this format:

```
SECURITY SCAN — [Date] (Post-market)

Market Context: VIX [value] ([normal/elevated/high]) │ [N] tickers scanned │ [N] in zone

YOUR PORTFOLIO CONTEXT:
[Sector]: [current]% (target [target]%) │ [Sector]: [current]% (target [target]%)

─── ENTRY ZONE ([N]) ────────────────────────────────────

[TICKER] │ $[price] │ [timeframe] [support/resistance] │ [distance] ATR away │ ENTRY
  Portfolio fit: [Why this matters for the user's portfolio]
  Position size: $[amount] ([%] of portfolio)
  [Any warnings: overweight sector, short holding period on funding source, etc.]

─── ALERT ZONE ([N]) ── [top 3 by portfolio relevance]

[TICKER] │ $[price] │ [distance] ATR from [timeframe] [support/resistance] │ ALERT
  Watching for: [What would move this to ENTRY zone]

RECOMMENDATION PRIORITY:
1. [Ticker] — [reason: strongest combined score]
2. [Ticker] — [reason]
3. [Ticker] — [reason]

Next steps: /decide [TICKER] to model scenarios, or /rebalance to generate a full trade plan.
```

5. Priority scoring:
   - Technical quality: ENTRY zone = 1.0, ALERT = 0.5. Add 0.2 per additional signal.
   - Portfolio fit: Larger sector gap = higher score.
   - Overall: technical × portfolio fit.
   - Highest combined score = #1 priority.

### /watchlist — Early Warning System

Show stocks approaching entry/alert zones in the next 1-5 trading days.

**Steps:**

1. WebFetch `GET {API_BASE}/api/scanner?filter=alert`
2. Read `profile/holdings.md`

3. Present:

```
WATCHLIST — [Date]

Approaching your zones in ~1-5 trading days:

APPROACHING SUPPORT ([N]):
[TICKER] │ $[price] │ [timeframe] support at $[level] │ [distance] ATR away
  [If user owns it]: You own [N] shares ($[value]). Add-to-winner opportunity.
  [If approaching earnings]: Earnings [date]. Consider waiting.

APPROACHING RESISTANCE ([N]):
[TICKER] │ $[price] │ [timeframe] resistance at $[level] │ [distance] ATR away
  [If user owns it]: Held [N] months — [short/long]-term gains rate applies.
```

### /signals — Technical Signal Feed

Show recent trading signals prioritized by portfolio relevance.

**Steps:**

1. WebFetch `GET {API_BASE}/api/signals?days=7`
2. Read `profile/holdings.md`

3. Present:

```
SIGNALS — Last 7 days

🟢 BULLISH
  [TICKER] │ [signal type] on [timeframe] │ [N] days ago
    [Context: near support, near entry zone, etc.]

🔴 BEARISH
  [TICKER] │ [signal type] on [timeframe] │ [N] days ago
    [If user owns it]: You own [N] shares. Watch for [level].

⚪ NEUTRAL
  [TICKER] │ [signal type] on [timeframe] │ [N] days ago
```

Signal types explained:
- **rsi_oversold**: RSI(14) < 30 — stock is heavily sold, potential bounce
- **rsi_overbought**: RSI(14) > 70 — stock is heavily bought, potential pullback
- **macd_bullish**: MACD crossed above signal line — momentum shifting up
- **macd_bearish**: MACD crossed below signal line — momentum shifting down
- **divergence (bull)**: Price made lower low but RSI made higher low — hidden buying
- **divergence (bear)**: Price made higher high but RSI made lower high — hidden selling
- **proximity**: Price within 1×ATR of a trendline — decision point approaching

## Profile Integration

Before every command, check if the user has a financial profile:

1. Read `profile/holdings.md` — current positions
2. Read `profile/goals.md` — allocation targets
3. Read `profile/financial-identity.md` — tax bracket

**If profile exists:**
- Filter and score results by portfolio context
- Provide position sizing based on actual portfolio size
- Note tax implications

**If profile doesn't exist:**
- Present raw scan results without portfolio filtering
- Suggest: "Run /setup to build your financial profile — I can then filter these results by what your portfolio actually needs."

After completing any screen/watchlist/signals command, append to `profile/history.md`:
```
## [Date] — Security Screen
- **Action**: [Scan / Watchlist check / Signal review]
- **Key findings**: [Top entry zone stocks, portfolio gaps identified, signals for owned positions]
- **Recommendations**: [Priority candidates, position sizes, next steps]
```

## Important Notes

- Disclaimer: "These are technical analysis signals, not investment advice. Always do your own research before acting on any signal."
- Never present scan results as "buy" recommendations — present them as "technically interesting + here's how they fit your portfolio"
- Always note that past technical patterns don't guarantee future results
- If the user has no profile, every scan result gets equal weight — that's a feature, not a bug (it prevents false confidence from incomplete data)
