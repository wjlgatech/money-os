---
name: cash-flow-intel
description: >
  Analyze income and expenses through a wealth-building lens, not a budgeting lens. Scores every
  spending category by "Freedom Impact," identifies surplus cash and routes it to highest-impact
  destinations (Roth, tax-loss harvest, emergency fund, debt payoff). Use when the user says
  "analyze my spending", "cash flow", "where should my money go", "optimize my spending",
  "how much can I invest", "surplus cash", "I have extra money this month", "what should I do
  with my paycheck", or provides bank statements, pay stubs, or expense data.
version: 0.1.0
---

# Cash Flow Intelligence

Analyze cash flow not to shame spending, but to maximize wealth-building velocity.

## Core Philosophy

This is NOT budgeting. Never say "you spent too much on X." Instead:
- Every dollar is rated by its Freedom Impact (how it accelerates or delays financial independence)
- Surplus cash is routed to the highest-impact destination automatically
- Wealth leaks are surfaced as found money, not moral failures

## Required Input

Obtain the user's income and expense data in any format: bank statements, screenshots, CSV,
pay stubs, manual listing. Extract:
- Monthly gross and net income (all sources)
- Recurring expenses by category
- Variable/discretionary spending
- Current savings rate
- Existing automatic investments/contributions

If data is incomplete, work with what's available and note gaps.

## Analysis Framework

### Step 1: Income Architecture

Map all income streams:
- W-2 salary (gross → net, note withholding for tax strategy hooks)
- RSU/ESPP vesting schedule (if applicable)
- Side income / freelance
- Investment income (dividends, interest)
- Other (rental, etc.)

Calculate effective tax rate. Flag if withholding is significantly over/under (hook to tax-strategy skill).

### Step 2: Freedom Impact Scoring

Score each expense category on a -3 to +3 scale:

| Score | Meaning | Examples |
|-------|---------|----------|
| +3 | Directly builds wealth | Roth IRA contribution, 401k match capture |
| +2 | Protects wealth | Emergency fund, essential insurance, health |
| +1 | Enables earning | Education, reliable transport, work tools |
| 0 | Neutral | Housing at reasonable DTI, basic utilities |
| -1 | Low impact | Entertainment within reason, dining out |
| -2 | Wealth drag | Unused subscriptions, high-interest debt payments |
| -3 | Wealth destruction | Payday loans, gambling, depreciating financed assets |

Present the scoring as insight, not judgment. A -1 isn't "bad" — it's just not accelerating freedom.

### Step 3: Surplus Identification

Calculate monthly surplus: Net Income - Essential Expenses - Reasonable Discretionary.

If surplus is negative, identify the top 3 most impactful changes (largest freedom impact shift per dollar).

### Step 4: Optimal Routing

Read `references/surplus-routing-rules.md` for the decision tree.

Route surplus cash through a priority waterfall:
1. Employer 401k match (if not maxed) — infinite ROI
2. High-interest debt (>7% APR) — guaranteed return
3. Emergency fund to 3-month target
4. Roth IRA ($7,000 limit for 2025)
5. Tax-loss harvesting deployment (if opportunities exist — hook to tax-harvest skill)
6. HSA ($4,300 individual / $8,550 family)
7. Mega Backdoor Roth (if employer allows)
8. 401k max ($23,500)
9. Taxable brokerage (aligned with investment thesis)
10. Emergency fund to 6-month target

For each recommendation, show the projected 10-year and 20-year impact.

### Step 5: Wealth Leak Quick Scan

Flag obvious leaks (detailed scan is in wealth-leak-scanner skill):
- Subscriptions with no usage in 90+ days
- Cash in accounts earning <1% when HYSA pays 4%+
- Insurance that could be repriced
- Debt with refinancing opportunity

## Output Format

```
CASH FLOW INTELLIGENCE REPORT
═══════════════════════════════
Monthly Income: $X,XXX (net)
Monthly Essentials: $X,XXX
Monthly Discretionary: $X,XXX
Monthly Surplus: $X,XXX
Current Savings Rate: XX%

FREEDOM IMPACT SCORECARD
[Category] [$Amount] [Score] [Insight]

SURPLUS ROUTING PLAN
Priority 1: [Action] — $XXX/mo → [Projected 20yr value: $XXX,XXX]
Priority 2: [Action] — $XXX/mo → [Projected 20yr value: $XXX,XXX]
...

WEALTH LEAKS DETECTED: X items, $XXX/month recoverable

FREEDOM ACCELERATION
Current pace: X.X years to Freedom Number
With routing plan: X.X years (saves X.X years)
```

Always chain: "Want me to run a full wealth leak scan? Or calculate your Freedom Number?"

## Important Notes

- Frame everything as "acceleration" not "restriction"
- Never moralize about spending choices
- Always show the compound effect: "$150/mo → $72K in 20 years at 10% return"
- Disclaimer: "This is analytical framework output, not financial advice."
