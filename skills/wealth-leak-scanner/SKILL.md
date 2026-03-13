---
name: wealth-leak-scanner
description: >
  Deep scan across your entire financial life to find hidden money drains — zombie subscriptions,
  suboptimal interest rates, wrong tax lots, insurance overpayment, fee drag, RSU cost basis errors,
  unclaimed credits, and more. Use when the user says "find my wealth leaks", "where am I losing money",
  "leak scan", "money drain", "hidden fees", "am I wasting money", "financial audit",
  "find savings I'm missing", "what am I overpaying for", or when the cash-flow-intel skill flags leaks.
  This skill finds HIDDEN drains. For routing surplus cash, use cash-flow-intel instead.
version: 0.1.0
---

# Wealth Leak Scanner

Hunt for hidden money drains that silently erode wealth — most people have $2,000-8,000/year in fixable leaks.

## Core Philosophy

A wealth leak is money you're losing without knowing it, or money you could have but aren't capturing. Unlike discretionary spending (which is a choice), leaks are unintentional value destruction. Finding and fixing them is pure wealth creation.

## Required Input

Gather what's available across all categories:
- Bank statements (savings account rates, fees)
- Investment accounts (holdings, fee structures, lot selections)
- Insurance policies (auto, home, life, health premiums)
- Subscription list (or bank statement showing recurring charges)
- Tax return (most recent — for missed deductions/credits)
- Debt summary (rates, balances, terms)
- 401k plan details (expense ratios, match details)
- Pay stub (withholding accuracy)

Work with whatever the user can provide — even a partial scan is valuable.

## Scan Categories (8 Leak Types)

### Leak 1: Zombie Subscriptions ($200-1,200/yr typical)

Scan recurring charges for:
- Services not used in 90+ days
- Free trials that converted to paid
- Duplicate services (e.g., Spotify + Apple Music)
- Price-hiked subscriptions user isn't aware of
- Annual renewals coming up that could be cancelled

Flag each with: name, monthly cost, last known usage, annual waste.

### Leak 2: Cash Earning Nothing ($100-2,000/yr typical)

Identify cash in low-yield accounts:
- Checking accounts with >$2,000 excess balance (beyond monthly float)
- Savings accounts earning <3% when HYSA pays 4%+
- 401k money market funds at 0.1% vs. stable value at 3%+
- Brokerage sweep accounts at low rates

Calculate: annual interest lost = (idle cash) × (best available rate - current rate)

### Leak 3: Fee Drag ($200-3,000/yr typical)

Identify excessive fees:
- Mutual funds with expense ratio >0.5% (when equivalent index fund is 0.03%)
- 401k plan fees (average total plan cost 0.5-1.5%, good plans 0.1-0.3%)
- Advisory fees on accounts that could be self-managed
- Trading fees (if using a non-zero-commission broker)
- Bank account maintenance fees
- Wire transfer fees, ATM fees

Calculate: annual fee drag = assets × (current ER - best available ER)

### Leak 4: Insurance Overpricing ($300-2,000/yr typical)

Flag insurance optimization opportunities:
- Auto insurance: not shopped in 2+ years (average savings: 20-30% by switching)
- Home insurance: not bundled with auto, or not shopped recently
- Life insurance: term vs. whole life (whole life almost always worse for wealth building)
- Health insurance: HSA-eligible plan not selected when it would save money
- Umbrella policy: missing when net worth exceeds $500K (liability risk)

### Leak 5: Tax Lot Errors ($200-5,000/yr typical)

Read the tax-strategy and tax-harvest skill references for details. Flag:
- RSU cost basis not properly reported on tax return (the #1 most expensive error)
- Selling highest-cost-basis lots instead of specific lot identification
- Missing foreign tax credit on international fund dividends
- Not harvesting available tax losses
- Withholding too much (giving IRS a 0% interest loan)
- Withholding too little (penalty risk)

### Leak 6: Debt Inefficiency ($200-5,000/yr typical)

Identify suboptimal debt:
- Credit card balances when balance transfer at 0% APR available
- Student loans not refinanced after income increased
- Mortgage not refinanced despite rate drops (if >0.75% improvement possible)
- Auto loan at dealer rate when credit union offers less
- Paying minimums on high-interest while holding excess cash

### Leak 7: Employer Benefit Gaps ($500-10,000/yr typical)

The most expensive leaks are uncaptured employer benefits:
- Not maxing 401k match (literally leaving free money on the table)
- Not enrolled in ESPP (typically 15% discount = guaranteed return)
- Not using HSA when eligible
- Not using dependent care FSA ($5,000 pre-tax)
- Not using commuter benefits (pre-tax transit)
- Mega Backdoor Roth available but not utilized

### Leak 8: Unclaimed Credits & Deductions ($100-3,000/yr typical)

Read `references/common-leaks-checklist.md` for the full list.

Quick scan:
- Saver's Credit (income <$38,250 single / $76,500 MFJ)
- Child Tax Credit (not fully captured)
- Education credits (American Opportunity, Lifetime Learning)
- EV credit ($7,500)
- Energy efficiency credits (heat pump, solar, etc.)
- State-specific credits and deductions

## Output Format

```
WEALTH LEAK SCAN RESULTS
════════════════════════
Total leaks found: XX
Total annual value: $X,XXX/year
Total 20-year compound value: $XXX,XXX

CRITICAL (fix this week):
🔴 [Leak] — $X,XXX/year — [Specific fix action]

HIGH PRIORITY (fix this month):
🟠 [Leak] — $XXX/year — [Specific fix action]

MODERATE (fix this quarter):
🟡 [Leak] — $XXX/year — [Specific fix action]

SUMMARY TABLE:
| Category | Leaks Found | Annual Value | Fix Difficulty |
```

Show the total 20-year compound value of fixing all leaks: "Fixing these leaks and investing the savings generates $XXX,XXX over 20 years."

Always chain: "Want me to help fix the top leak right now? Or run a cash flow analysis to see where the recovered money should go?"

## Important Notes

- Every leak must have a specific, actionable fix — not just "look into this"
- Quantify everything in annual dollars AND 20-year compound value
- Rank by: annual value × ease of fix (effort-adjusted return)
- Never shame — frame as "found money" and "optimization"
- Disclaimer: "This is analytical framework output, not financial advice."
