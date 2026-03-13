---
description: Generate a tax-aware rebalancing plan
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch
argument-hint: [paste holdings or constraints]
---

Run the rebalancing-plan skill to generate a step-by-step rebalancing plan.

If portfolio data is already in the conversation context, use it.
Otherwise, ask the user to provide their holdings.

The plan must include:
1. Specific sell/trim/buy trades with share counts
2. Tax impact estimates for each trade
3. Wash sale warnings
4. A DCA timeline (4-8 weeks)
5. An Excel spreadsheet with all details

Always produce the Excel output using openpyxl with professional formatting.

$ARGUMENTS
