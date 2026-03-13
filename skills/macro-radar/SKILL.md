---
name: macro-radar
description: >
  Monitor macroeconomic signals and generate actionable portfolio alerts. Use when the user
  says "check macro signals", "macro radar", "is a crash coming", "should I be worried about
  the market", "what macro risks should I watch", "Japan debt crisis", "VIX check",
  "market risk assessment", "black swan signals", "when should I deploy cash", or asks about
  any macroeconomic indicator's impact on their portfolio.
version: 0.1.0
---

# Macro Signal Radar

Monitor key macroeconomic signals and translate them into specific portfolio actions. This is NOT about predicting the market — it's about having pre-defined playbooks for known risk scenarios.

## Signal Categories

### Tier 1: High-Impact Signals (check weekly)

Read `references/signal-definitions.md` for detailed thresholds and data sources.

**1. VIX (Fear Index)**
- Source: CBOE Volatility Index
- Use web search to get current VIX level
- Thresholds and actions defined in reference file

**2. US 10-Year Treasury Yield**
- Source: US Treasury
- Impacts: Growth stock valuations, mortgage rates, risk appetite
- Thresholds and actions defined in reference file

**3. Japan 10-Year Government Bond Yield**
- Source: Bank of Japan
- Why it matters: Japan is largest foreign holder of US Treasuries. Rising Japanese yields incentivize repatriation of capital from US assets.
- This is the "Black Swan" signal from the Nicolas Yang framework

**4. US Dollar Index (DXY)**
- Source: ICE
- Impacts: International holdings, commodity prices, emerging markets

### Tier 2: Sector Signals (check monthly)

**5. Oil Price (WTI Crude)**
- Impacts: Energy stocks, inflation, consumer spending, transportation

**6. Gold Price**
- Impacts: Gold holdings, inflation expectations, geopolitical risk sentiment

**7. Semiconductor Book-to-Bill Ratio**
- Impacts: AI/chip thesis, capacity utilization

**8. Data Center Power Demand Forecasts**
- Impacts: Nuclear/energy thesis, utility stocks, cooling companies

### Tier 3: Policy Signals (check quarterly)

**9. Federal Reserve Rate Decisions**
- Impacts: Everything — valuation multiples, bond prices, housing

**10. US Defense Budget Trajectory**
- Impacts: Defense stocks (PLTR, LMT, RTX)

**11. Tariff Policy Changes**
- Impacts: Industrials, manufacturing, international supply chains

## How to Run a Macro Check

1. Use web search to gather current levels for all Tier 1 signals
2. Compare to thresholds in reference file
3. Generate a signal dashboard:

```
MACRO RADAR — [Date]

Signal                  | Current  | Status  | Trigger Level | Action
------------------------|----------|---------|--------------|--------
VIX                     | XX.X     | 🟢/🟡/🔴 | >30          | [action]
US 10Y Yield            | X.XX%    | 🟢/🟡/🔴 | >5.0%        | [action]
Japan 10Y Yield         | X.XX%    | 🟢/🟡/🔴 | >1.5%        | [action]
DXY                     | XXX.X    | 🟢/🟡/🔴 | >110         | [action]
Oil (WTI)               | $XX.XX   | 🟢/🟡/🔴 | >$120        | [action]
Gold                    | $X,XXX   | 🟢/🟡/🔴 | >$3,500      | [action]
```

4. For any 🔴 signal, provide detailed analysis and specific portfolio actions
5. For any 🟡 signal, note what would push it to 🔴

## Scenario Playbooks

For each major risk scenario, provide a pre-defined action plan. Read `references/scenario-playbooks.md` for details:

- **Japan Debt Crisis**: What to sell, what to buy, cash deployment strategy
- **US Recession**: Defensive rotation plan
- **AI Bubble Pop**: How to protect AI-heavy portfolios
- **Energy Crisis**: Which positions benefit, which suffer
- **Stagflation**: Gold/commodity tilt + defensive equity rotation

## Output

Always end with:
1. Overall risk level (Low / Elevated / High / Critical)
2. Top 1-2 actions to take RIGHT NOW
3. Signals to watch most closely this week/month
4. "Next check recommended: [date]"

## Profile Integration

Before starting analysis, check for the user's financial profile:

1. Read `profile/holdings.md` for current holdings and asset allocation (to contextualize macro signal impact)

If profile exists:
- Use holdings to explain which positions are most affected by each macro signal
- Provide signal assessment filtered to relevant asset classes (e.g., if not in crypto, skip crypto-specific signals)
- Reference prior macro checks from history for trend analysis

If profile doesn't exist:
- Provide general macro signal assessment
- Offer to save holdings snapshot for next macro check

After completing analysis, append a summary to `profile/history.md`:
```
## [Date] — Macro Radar Check
- **Action**: [Routine check / Response to specific event]
- **Key findings**: [Overall risk level, most relevant signals for user's portfolio, market regime assessment]
- **Recommendations**: [Signals to watch most closely, portfolio positioning adjustments if any]
```

## Important Notes

- Disclaimer: "This is macroeconomic commentary, not investment advice. Markets are unpredictable — no signal guarantees future outcomes."
- Never present macro signals as trading instructions
- Always note that individual circumstances should drive decisions, not macro headlines
