---
description: Scan for wealth leaks — subscriptions, fees, idle cash, missed benefits
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: [paste statements, holdings, or describe your financial setup]
---

Run the wealth-leak-scanner skill across the user's financial data.

Scan all 8 leak categories:
1. Zombie subscriptions (unused 90+ days)
2. Cash earning nothing (checking/savings at <1%)
3. Fee drag (expense ratios, advisory fees, transaction costs)
4. Insurance overpricing
5. Tax lot selection errors (FIFO vs specific lot)
6. Debt inefficiency (refinancing opportunities)
7. Employer benefit gaps (unclaimed match, unused HSA, ESPP)
8. Unclaimed credits/deductions

Quantify each leak in $/year and show the 20-year compound value of fixing it.
Prioritize by impact. Provide exact fix steps for each.

After scan, offer to:
1. Route recovered money optimally (chain to cash-flow-intel)
2. Fix tax-related leaks (chain to tax-strategy)
3. Export a leak fix action plan

$ARGUMENTS
