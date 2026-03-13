---
name: rebalancing-plan
description: >
  Generate a step-by-step portfolio rebalancing plan with specific trades, tax awareness,
  DCA timeline, and execution sequence. Use when the user says "rebalance my portfolio",
  "how should I rebalance", "what should I sell and buy", "fix my portfolio",
  "generate a rebalancing plan", "help me diversify", or after a portfolio health check
  reveals issues that need fixing.
version: 0.1.0
---

# Rebalancing Plan Generator

Produce a concrete, sequenced rebalancing plan that converts diagnostic findings into specific trades with tax awareness and execution timing.

## Required Input

- Current holdings (ticker, shares, value, cost basis, gain/loss)
- Account types (taxable, Roth IRA, Traditional IRA, 401k)
- Target allocation or investment thesis (if available)
- Any constraints (e.g., "don't sell NVDA", wash sale concerns, pending activity)

If a portfolio health check was already run, use those findings as input.

## Plan Generation Process

### Step 1: Classify Every Position

Assign each position one action:
- **HOLD**: Aligned with thesis, appropriate size
- **TRIM**: Aligned but oversized — sell partial
- **SELL**: Not aligned, dead weight, or tax-loss candidate
- **BUY**: New position needed to fill gap
- **SWAP**: Replace with better alternative in same category

### Step 2: Sequence for Tax Efficiency

Read `references/tax-aware-sequencing.md` for detailed rules.

Order of operations matters enormously for tax impact:
1. **Sell losers first** — harvest tax losses before realizing gains
2. **Trim winners in tax-advantaged accounts** — no tax impact in Roth/IRA
3. **Trim winners in taxable accounts** — offset with harvested losses
4. **Buy new positions** — deploy freed capital
5. **Build cash reserve** — if below target

### Step 3: Size Each Trade

For sells/trims:
- Calculate exact shares to sell
- Estimate proceeds
- Estimate tax impact (short-term vs long-term capital gains/losses)
- Flag wash sale risk if buying similar replacement

For buys:
- Calculate target dollar amount
- Suggest share count at current prices
- Assign priority (P0 = critical, P1 = high, P2 = medium, P3 = nice-to-have)

### Step 4: Create DCA Timeline

Spread execution over 4-8 weeks to reduce timing risk.
Group trades into weekly batches with dependencies:
- Week 1: All sells (generate cash + tax losses)
- Week 2-3: Trims + high-priority buys
- Week 4-6: Remaining buys (DCA into positions)
- Week 7-8: Review, adjust, rebalance remaining

### Step 5: Generate Output

Produce TWO outputs:

**1. Summary table** (for quick reference):
```
| Step | Action | Ticker | Shares | Est. Value | Tax Impact | Week |
```

**2. Detailed spreadsheet** (for execution):
Use the xlsx skill to create a professional Excel workbook with tabs:
- Current Holdings (with health flags)
- Sell/Trim Orders (with tax estimates)
- Buy Orders (with priority and DCA schedule)
- Target Allocation (post-rebalancing snapshot)
- Tax Impact Summary
- Execution Timeline

## Wash Sale Rules

Critical: Do NOT recommend selling a stock at a loss and buying a "substantially identical" security within 30 days before or after the sale. Flag these risks explicitly:
- Selling VTI and buying VOO within 30 days = wash sale risk
- Selling ARKK and buying individual ARKK holdings = generally NOT a wash sale
- Selling a stock in taxable and buying same stock in Roth within 30 days = wash sale

## Important Notes

- Frame all output as analytical options, not financial advice
- Always flag positions with >$10k unrealized gains as "high tax impact — review with advisor"
- If total portfolio exceeds $250k, add note: "Consider consulting a fee-only fiduciary advisor for tax-optimized execution"
- Include disclaimer at the end of every plan
