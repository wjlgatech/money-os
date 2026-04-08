# Dry Run: Yang Hormuz Thesis

This is an example output of the thesis-quality-analyzer skill applied to Nicolas Yang's
geopolitical investment thesis about the Hormuz Strait reopening signaling a market bottom.

---

```
╔══════════════════════════════════════════════════════════════════════╗
║  THESIS QUALITY REPORT                                              ║
║  Source: Nicolas Yang (YouTube / Newsletter)                        ║
║  Analyzed: 2026-04-07                                               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  VERDICT: C+ — Speculative                                          ║
║  "Two strong technical claims buried inside a geopolitical          ║
║   narrative with several unfalsifiable assumptions."                 ║
║                                                                      ║
║  Quality Score: 11.5/20 (after source modifier: 9.5/20)            ║
║                                                                      ║
║  Source type: YouTuber / Newsletter                                  ║
║  Source modifier: -2                                                 ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  CLAIMS SCORECARD                                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  #  Claim                    Test  Mech  Fals  Time  TOTAL  Action   ║
║  ── ──────────────────────── ────  ────  ────  ────  ─────  ──────── ║
║  1  Hormuz open → oil drops   4     4     5     4    17/20  MONITOR  ║
║  2  Low oil → stocks recover  4     5     4     3    16/20  VERIFY   ║
║  3  Semi demand > supply      3     4     4     3    14/20  VERIFY   ║
║  4  Gold drop = Arab selling  1     2     1     1     5/20  REJECT   ║
║  5  Cu/Ag surge on AI build   3     3     3     2    11/20  HEDGE    ║
║  6  Sell when news is good    2     3     2     1     8/20  HEDGE    ║
║                                                                      ║
║  Average: 11.8/20 → 9.8 after source modifier → Grade C+            ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  ⚠️  KILL ASSUMPTION                                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Claim #1: Hormuz Strait reopening = market bottom signal           ║
║                                                                      ║
║  If wrong: The entire thesis collapses. Claims 2, 5, and 6 all     ║
║  depend on the geopolitical tension resolving. If Hormuz closes     ║
║  again or oil doesn't drop, the "buy the bottom" signal was false.  ║
║                                                                      ║
║  Check:    WTI crude price RIGHT NOW. If below $70 and falling,     ║
║            the oil-drop part is confirmed. If above $85, the        ║
║            reopening hasn't translated to lower oil yet.             ║
║  Deadline: 60 days. If oil hasn't dropped meaningfully by then,     ║
║            the Hormuz reopening wasn't the catalyst Yang claims.    ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  PORTFOLIO OVERLAP (from profile/holdings.md)                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Already exposed to:                                                ║
║    Semiconductors: TSM (3.1%), NVDA (21%), AMD (14%) = 38%          ║
║    Gold: IAU (2.8%)                                                  ║
║    Copper/Silver: 0%                                                 ║
║    Defense infra: 0%                                                 ║
║                                                                      ║
║  Concentration risk: ⚠️ CRITICAL                                     ║
║    Portfolio is already 38% semis. Yang thesis adds MORE semis      ║
║    (SMH, ASML, TER, LRCX, AMAT). Full adoption would push         ║
║    semiconductor exposure above 50% — extreme concentration.        ║
║                                                                      ║
║  Thesis alignment score: 4/10                                       ║
║    Strong semi overlap, but missing commodities + defense entirely  ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════
  ACTION PLAN
═══════════════════════════════════════════════════════════════════════

  🔴 ACT NOW (do today)
  ────────────────────────────────────────────────────────────────────
  1. Check WTI crude price — search "WTI crude oil price today"
     Why: Validates kill assumption (Claim #1). If oil > $85, thesis
     trigger hasn't fired yet. If < $70 and falling, it's confirmed.

  2. Run /macro-radar — check VIX, 10Y yield, DXY, oil, gold
     Why: Yang's thesis is macro-driven. Macro-radar gives you live
     readings on every signal that matters to this thesis in one check.

  3. Do NOT add more semiconductor positions
     Why: You're already 38% semis. Yang's thesis would push you past
     50%. Even if the thesis is right, concentration risk > thesis
     upside. You have this trade already.

  🟡 VERIFY FIRST (before committing capital)
  ────────────────────────────────────────────────────────────────────
  1. Run /strategy-lab: "Buy SMH when RSI < 35 near weekly support,
     sell at +8% or stop at -2×ATR"
     Pass condition: Win rate > 50%, Sharpe > 1.0 over 2-year backtest
     If it fails: Yang's semi timing adds no edge over buy-and-hold SMH

  2. Check TSMC + ASML fundamentals via screener API:
     GET /api/fundamentals?tickers=TSM,ASML,AMAT,LRCX,TER
     Verify: Revenue growth positive? P/E below 5-year average?
     If declining: The "2% capacity" claim is already failing in the
     numbers — current demand may not match Yang's projections

  3. Run /strategy-lab: "Buy COPX when near daily support with
     RSI oversold, sell at +10% or stop at -2×ATR"
     Pass condition: Profit factor > 1.2
     If it fails: Copper's technical entry doesn't add alpha — skip
     COPX and just buy SLV (more liquid, lower spread)

  🟢 MONITOR ONGOING (set these watchpoints)
  ────────────────────────────────────────────────────────────────────
  1. WTI Crude: watch for sustained move below $65
     Check: Weekly
     If triggered: Confirms Hormuz reopening impact → deploy
     tranche 1 into non-semi thesis positions (COPX, GEV, PWR)

  2. VIX: watch for drop below 15 combined with portfolio RSI > 70
     Check: Daily when VIX < 18
     If triggered: This IS Yang's "sell when news is good" signal —
     trim 20% of thesis positions into strength

  3. GEV + PWR order books: search quarterly for backlog updates
     Check: Quarterly (earnings calls)
     If confirmed: Orders still booked past 2030 → hold or add
     If backlog shrinks: Exit — the moat is leaking

  🛡️ HEDGE THESE (protect against untestable claims)
  ────────────────────────────────────────────────────────────────────
  1. Claim #5 (copper/silver surge on AI build):
     Max position: 3% of portfolio across COPX + SLV
     Stop-loss: -12% from entry
     Time box: 6 months — if metals haven't moved by Oct 2026,
     the AI-infrastructure-demand thesis isn't translating to prices.
     Exit and redeploy to higher-conviction positions.

  2. Claim #6 (sell when news is positive):
     Can't set this as an automatic exit. Instead:
     Use VIX < 15 + basket RSI > 70 as a quantifiable proxy.
     When both conditions hit: trim 20-25%, don't wait for CNBC.
     Set a calendar reminder to check this monthly.

  ❌ DO NOT TRADE
  ────────────────────────────────────────────────────────────────────
  1. Claim #4: "Gold dropped because Arabs sold reserves for cash
     and weapons" — REJECT
     Reason: Unfalsifiable. No public data on sovereign gold sales
     during conflict. The mechanism (sell gold → buy weapons) is
     speculative. Gold price movements have many causes.
     You already hold IAU (2.8%) — that's fine as a hedge. Don't
     ADD gold based on this specific claim.

  📍 NEXT SKILL
  ────────────────────────────────────────────────────────────────────
  → Run /macro-radar NOW (validates kill assumption + macro signals)
  → Run /strategy-lab for Claims 2 + 3 (the two testable claims)
  → ONLY IF both pass: Run /thesis-to-trades to build trade plan
  → Skip thesis-to-trades for rejected and hedged claims

═══════════════════════════════════════════════════════════════════════

  🐻 BEAR CASE — What if this thesis is wrong?
  ────────────────────────────────────────────────────────────────────
  Claim 1 counter: Hormuz reopened temporarily before (2019). Oil
    rebounded within 3 months. The "permanent reopening" may not stick.

  Claim 2 counter: Oil dropped in 2014-2016 but stocks didn't recover
    for 18 months. Low oil ≠ automatic stock rally — correlation is
    regime-dependent.

  Claim 3 counter: Semi demand projections by industry insiders are
    notoriously optimistic. TSMC guided down in 2023 after identical
    "AI demand is infinite" narratives.

  Claim 5 counter: Copper has disappointed AI-demand bulls before.
    COPX was flat in 2024 despite record data center announcements.

  Worst-case portfolio impact if ALL claims fail:
    Estimated loss: -$2,800 (1.3% of $222K portfolio)
    Assuming: 3% max position per claim, 12% stop-loss on each
    This is survivable. The hedging framework keeps you in the game.
```

---

## Analysis of the Dry Run

**Does this produce actionable output?** Let's check:

| Output Section | Actionable? | Next Step Clear? |
|----------------|-------------|------------------|
| Claim scorecard | ✅ Each claim has an action label | ✅ VERIFY/MONITOR/HEDGE/REJECT |
| Kill assumption | ✅ "Check WTI crude RIGHT NOW" | ✅ Specific check + deadline |
| ACT NOW | ✅ Three concrete today-actions | ✅ Each has a "why" |
| VERIFY FIRST | ✅ Specific strategy-lab commands | ✅ Pass/fail criteria defined |
| MONITOR | ✅ Signal + threshold + frequency | ✅ "If triggered → [action]" |
| HEDGE | ✅ Position cap + stop + time box | ✅ Exit date specified |
| DO NOT TRADE | ✅ Specific claim rejected with reason | ✅ Existing position noted |
| Bear case | ✅ Counter-argument per claim | ✅ Max loss calculated |

**Key insight from the dry run:** The most important output is "Do NOT add more semiconductor positions." The user is already 38% semis — Yang's thesis would push concentration past 50%. The thesis analyzer caught this because it checks portfolio overlap. Without this check, thesis-to-trades would have happily generated buy orders for SMH, ASML, TER, LRCX, and AMAT on top of existing NVDA + AMD + TSM exposure.

**The skill's value proposition:** It sits UPSTREAM of thesis-to-trades and strategy-lab. It decides WHICH claims are worth sending downstream — and with what position sizes. This prevents the common retail mistake of "I heard a thesis, I liked it, I went all in."
