---
name: tax-harvest
description: >
  Identify and quantify tax-loss harvesting opportunities across a multi-account portfolio.
  Use when the user says "tax loss harvest", "find tax losses", "what can I harvest",
  "tax optimization", "reduce my tax bill", "offset my gains", "capital gains tax",
  "which losers should I sell", or during year-end tax planning.
version: 0.1.0
---

# Tax-Loss Harvesting Scanner

Scan a portfolio for positions with unrealized losses that can be sold to generate tax deductions, then calculate the net tax benefit and suggest replacement positions to maintain market exposure.

## Scanning Process

### Step 1: Identify All Losing Positions

For each position across ALL accounts, calculate:
- Unrealized gain/loss in dollars
- Unrealized gain/loss as percentage
- Holding period (short-term < 1 year, long-term >= 1 year)
- Account type (taxable vs tax-advantaged)

**Only positions in TAXABLE accounts generate tax benefits.** Losses in Roth IRA, Traditional IRA, and 401k have no tax impact and should NOT be harvested for tax purposes (may still be worth selling for portfolio reasons).

### Step 2: Rank Harvest Candidates

Sort taxable account losers by:
1. Dollar amount of loss (largest first)
2. Strategic value (positions you'd want to own = lower priority to harvest)
3. Holding period (short-term losses are more valuable — offset ordinary income rates)

### Step 3: Calculate Tax Benefit

Read `references/tax-harvest-math.md` for detailed calculations.

For each candidate, estimate:
- Tax saved = Loss amount x applicable tax rate
- Short-term losses save more (ordinary income rate, up to 37%)
- Long-term losses save less (capital gains rate, 15-20%)
- First $3,000 of net losses offset ordinary income (most valuable)
- Remaining losses offset capital gains dollar-for-dollar
- Excess losses carry forward to future years

### Step 4: Check Wash Sale Exposure

For each harvest candidate, flag if:
- You bought the same security within the past 30 days
- You plan to buy it back within the next 30 days
- You hold the same security in another account (cross-account wash sales apply)

### Step 5: Suggest Replacements

For each harvested position, suggest a replacement that:
- Maintains similar market exposure
- Is NOT "substantially identical" (avoids wash sale)
- Can be swapped back after 31 days if desired

### Step 6: Output

Produce a harvest report:

```
TAX-LOSS HARVESTING OPPORTUNITIES

Total Harvestable Losses: $XX,XXX
Estimated Tax Savings: $X,XXX - $X,XXX (depending on bracket)

| Ticker | Account | Loss $ | Loss % | Type | Tax Saved | Replacement | Wash Sale Risk |
```

Include a "Gains to Offset" section showing any realized gains from the current tax year that these losses can offset.

## Profile Integration

Before starting analysis, check for the user's financial profile:

1. Read `profile/financial-identity.md` for tax bracket (affects how much tax losses are worth)
2. Read `profile/holdings.md` for full holdings across all accounts, including cost basis

If profile exists:
- Use stored holdings to avoid re-requesting account positions
- Calculate tax savings using their specific marginal rate
- Flag any cross-account wash sale risks
- Reference prior harvests from history to track carryforward losses

If profile doesn't exist, proceed normally and offer to save:
- Complete holdings snapshot with cost basis
- Realized gains/losses from current tax year
- Tax loss carryforwards from prior years (if any)

After completing analysis, append a summary to `profile/history.md`:
```
## [Date] — Tax-Loss Harvest Scan
- **Action**: [Routine harvest / Response to specific gains]
- **Key findings**: [Total harvestable losses, estimated tax savings at user's bracket, wash sale risks identified]
- **Recommendations**: [Highest-value harvests to execute, replacement position suggestions]
```

## Important Rules

- NEVER harvest a loss just for tax purposes if the position is a core holding you'd rebuy immediately — the wash sale rule eliminates the benefit
- Harvesting makes most sense for dead weight positions you wouldn't rebuy
- Always note: "Tax situations are individual. Consult a tax professional for advice specific to your situation."
- Disclaimer: "This is tax-loss harvesting analysis, not tax advice. Verify all calculations with a CPA before executing trades."
- If total portfolio > $250k or total harvest > $10k, strongly recommend CPA review
