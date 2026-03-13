---
description: Check macro signals and generate portfolio alerts
allowed-tools: Read, WebSearch, WebFetch, Write, Bash
argument-hint: [optional: specific signals to focus on, e.g., "VIX and yields"]
---

Run the macro-radar skill to check current macroeconomic signals.

1. Use web search to get current levels for ALL Tier 1 signals:
   - VIX (search "VIX index today")
   - US 10-Year Treasury yield (search "US 10 year treasury yield today")
   - Japan 10-Year bond yield (search "Japan 10 year bond yield today")
   - DXY US Dollar Index (search "DXY dollar index today")
   - Oil WTI price (search "WTI crude oil price today")
   - Gold price (search "gold price per ounce today")

2. Compare each signal against the thresholds in the macro-radar skill references.

3. Generate the signal dashboard with color-coded status.

4. For any red or yellow signals, provide detailed analysis and specific portfolio actions.

5. End with overall risk assessment and recommended next check date.

$ARGUMENTS
