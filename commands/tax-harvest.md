---
description: Find tax-loss harvesting opportunities in your portfolio
allowed-tools: Read, Write, Edit, Bash, Grep
argument-hint: [paste holdings or path to file]
---

Run the tax-harvest skill to scan for tax-loss harvesting opportunities.

If portfolio data is already in the conversation context, use it.
Otherwise, ask the user to provide their holdings with cost basis information.

The scan must:
1. Identify all positions with unrealized losses in TAXABLE accounts only
2. Calculate estimated tax savings at multiple bracket levels
3. Flag wash sale risks
4. Suggest replacement positions to maintain exposure
5. Produce a prioritized harvest list sorted by tax benefit

Output both a summary in conversation and an Excel spreadsheet for execution.

$ARGUMENTS
