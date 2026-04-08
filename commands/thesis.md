---
description: "Stress-test any investment thesis, get AI analyst debate, and trade only what survives. One command: idea → quality gate → analyst team → sized trades → human approval."
allowed-tools:
  - WebFetch
  - WebSearch
  - Read
  - Write
  - Bash
argument-hint: "[paste a thesis, or say 'I saw a video by X about Y', or 'test this idea: buy semis because AI demand']"
---

# /thesis — The Full Pipeline

One command takes an investment thesis from raw idea to risk-managed, human-approved trades.

Read `skills/thesis-pipeline/SKILL.md` and execute the unified 6-phase pipeline:

1. **INTAKE** — Parse the thesis from whatever format the user provides
2. **QUALITY GATE** — Score every claim (thesis-quality-analyzer)
3. **ANALYST DEBATE** — Run TradingAgents on surviving claims (if available)
4. **PORTFOLIO FIT** — Gap analysis against current holdings (thesis-to-trades)
5. **TRADE PROPOSALS** — Conviction-weighted proposals with stops + targets
6. **HUMAN GATE** — Present for approval. User decides. Machine executes.

The user never sees skill names, API calls, or pipeline internals. They see:
"Here's your thesis. Here's what's strong, what's weak. Here's what my analysts say. Here's the trade plan. Approve?"

$ARGUMENTS
