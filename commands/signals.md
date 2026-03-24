---
description: Show recent technical trading signals (RSI, MACD, divergence, proximity) prioritized by portfolio relevance
allowed-tools:
  - WebFetch
  - Read
  - Write
argument-hint: "[days to look back, e.g. '7', '14']"
---

Show recent technical trading signals across your universe.

Use the `security-screener` skill to:
1. Fetch recent signals from the screener API
2. Prioritize by portfolio relevance (signals for stocks you own first)
3. Group by bullish / bearish / neutral
4. Include context for each signal

Read `skills/security-screener/SKILL.md` for the full `/signals` process.
