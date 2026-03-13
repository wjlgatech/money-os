---
name: portfolio-health-check
description: >
  Run a comprehensive portfolio health check that surfaces concentration risk, dead weight positions,
  missing diversification, and cash reserve adequacy. Use when the user says "check my portfolio",
  "portfolio health", "am I too concentrated", "what's wrong with my portfolio", "audit my holdings",
  "risk check", "portfolio review", or shares a list of holdings and asks for feedback.
version: 0.1.0
---

# Portfolio Health Check

Run a structured diagnostic on a portfolio, producing a scored report card with actionable findings.

## Required Input

Obtain the user's holdings in any format: screenshots, pasted text, CSV, or spreadsheet. Extract for each position: ticker, shares, current value, cost basis (if available), gain/loss %.

If the user has multiple accounts, treat them as ONE unified portfolio for analysis. Track per-account details but score at the aggregate level.

## Diagnostic Framework (5 Dimensions)

Score each dimension 1-10 and provide an overall portfolio health score.

### 1. Concentration Risk (Weight: 30%)

Read `references/concentration-rules.md` for thresholds.

Flag any position exceeding safe thresholds. Calculate the Herfindahl-Hirschman Index (HHI) across all positions. Score 10 = well-diversified, 1 = dangerously concentrated.

### 2. Dead Weight Detection (Weight: 15%)

Identify positions that are:
- Down >50% from cost basis with no strategic thesis
- Less than 0.5% of portfolio (too small to matter)
- Leveraged/inverse ETFs held long-term (structural decay)
- Overlapping exposures (e.g., ARKK + individual holdings within ARKK)

Calculate total capital trapped in dead weight. Flag harvestable tax losses.

### 3. Cash Reserve Adequacy (Weight: 20%)

Read `references/cash-rules.md` for guidelines.

Evaluate cash as % of total portfolio. Score against the 20-30% reserve rule for active investors, or 3-6 month emergency fund for passive investors. Distinguish between idle cash and strategic "dry powder."

### 4. Framework Alignment (Weight: 20%)

If the user has an investment thesis or framework, compare portfolio to it. Identify:
- Sectors/themes the thesis emphasizes but portfolio lacks
- Positions that contradict or are absent from the thesis
- Over-allocation to themes not in the thesis

If no thesis provided, evaluate against broad diversification principles (sector, geography, asset class).

### 5. Account Structure (Weight: 15%)

Evaluate tax-efficiency of asset placement across account types:
- High-growth/volatile stocks in Roth IRA (tax-free gains)
- Dividend/bond positions in tax-advantaged accounts
- Tax-loss harvesting candidates in taxable accounts
- Age-appropriate risk for minor/retirement accounts

## Output Format

Produce a structured report:

```
PORTFOLIO HEALTH SCORE: [X]/10

[Visual bar for each dimension with score]

CRITICAL FINDINGS (act this week):
- [Finding with specific ticker, dollar amount, and action]

HIGH PRIORITY (act this month):
- [Finding with details]

OPPORTUNITIES:
- [Finding with details]

SUMMARY TABLE:
| Ticker | Value | % of Portfolio | Issue | Action |
```

Always end with: "Want me to generate a rebalancing plan to fix these issues?" to chain to the rebalancing-plan skill.

## Important Notes

- Never provide investment advice framed as recommendations. Frame as "diagnostic findings" and "options to consider."
- Always include the disclaimer: "This is analytical framework output, not financial advice. Consult a financial advisor before making investment decisions."
- When calculating percentages, use total portfolio value across ALL accounts as the denominator.
- Flag any pending activity or unsettled trades that affect the analysis.
