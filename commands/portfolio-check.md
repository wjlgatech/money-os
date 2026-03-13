---
description: Run a portfolio health check on your holdings
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: [paste holdings or path to file]
---

Run the portfolio-health-check skill on the user's holdings.

If the user provides holdings as text, parse them into a structured format.
If the user provides a file path, read and parse the file.
If the user provides screenshots, extract holdings from the images.

After the health check, ask if the user wants to:
1. Generate a rebalancing plan (chain to rebalancing-plan skill)
2. Scan for tax-loss harvesting opportunities (chain to tax-harvest skill)
3. Export the results as an Excel spreadsheet

$ARGUMENTS
