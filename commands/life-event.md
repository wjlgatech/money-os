---
description: Get a financial action plan for any life event — job change, baby, marriage, inheritance
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: [describe the life event, e.g., "I just got a raise" or "having a baby in June"]
---

Run the life-event-router skill for the user's specific life event.

Detect the event type and generate a prioritized, time-sequenced action plan.
Cover immediate actions (this week), 30-day actions, and 90-day actions.
Flag common expensive mistakes people make during this event.
Quantify financial impact where possible.

Supported events: job change, raise, job loss, bonus, RSU vest, retirement,
marriage, baby, divorce, inheritance, home purchase/sale, car purchase,
state move, and age milestones (26, 50, 55, 59.5, 62-70, 65, 73).

After planning, offer to:
1. Recalculate Freedom Number with new parameters (chain to freedom-number)
2. Run tax implications (chain to tax-strategy)
3. Rebalance portfolio if needed (chain to rebalancing-plan)

$ARGUMENTS
