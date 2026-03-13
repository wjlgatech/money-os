---
description: Analyze your cash flow and route surplus to highest-impact destinations
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: [paste income/expenses, bank statement, or pay stub]
---

Run the cash-flow-intel skill on the user's income and expense data.

Accept data in any format: bank statements, CSV exports, screenshots, pay stubs, or manual listing.
Extract income streams, recurring expenses, variable spending, and current savings rate.

Score each spending category by Freedom Impact (-3 to +3).
Identify monthly surplus and route it through the priority waterfall.
Show 10-year and 20-year compound projections for each routing recommendation.

After analysis, offer to:
1. Run a full wealth leak scan (chain to wealth-leak-scanner skill)
2. Calculate their Freedom Number (chain to freedom-number skill)
3. Export results as a spreadsheet

$ARGUMENTS
