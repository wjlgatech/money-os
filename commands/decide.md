---
description: Model any financial decision with probability-weighted scenarios
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: [describe the decision, e.g., "should I rent or buy?" or "Roth conversion this year?"]
---

Run the decision-modeler skill for the user's financial decision.

Build 3-5 probability-weighted scenarios over 1, 5, 10, and 20 year horizons.
Calculate expected value for each option. Run sensitivity analysis on key variables.
Identify the decision's reversibility and stakes.

Pre-built templates available for: Rent vs Buy, Roth Conversion, Sell vs Hold Stock,
Stay vs Switch Jobs, Refinance Mortgage, Lump Sum vs DCA.

For custom decisions, build the model from scratch using the 6-step framework.

Present a clear recommendation with the key assumption that could change it.

After modeling, offer to:
1. Execute the recommended path (chain to appropriate skill)
2. Stress-test against macro scenarios (chain to macro-radar)
3. Export the decision model as a spreadsheet

$ARGUMENTS
