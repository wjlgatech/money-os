#!/usr/bin/env python3
"""
TradingAgents ↔ Money OS Bridge
================================

Connects the TradingAgents multi-agent debate system (Python/LangGraph)
to Money OS's screener API and trade execution pipeline.

Flow:
  1. Accepts ticker + thesis claim from Money OS (CLI args or stdin JSON)
  2. Fetches supporting data from Money OS API (scanner, signals, fundamentals)
  3. Runs TradingAgents analyst debate (if TA is installed)
  4. Returns structured verdict to stdout (JSON) for Money OS to consume

Usage:
  # Single ticker with thesis context
  python3 ta-bridge.py --ticker COPX --thesis "Copper surges on AI data center build"

  # Multiple tickers from a thesis pipeline (reads JSON from stdin)
  echo '{"claims": [{"ticker": "COPX", "claim": "..."}, {"ticker": "GEV", "claim": "..."}]}' | python3 ta-bridge.py --batch

  # Dry run (skip TA, just fetch Money OS data and produce a mock verdict)
  python3 ta-bridge.py --ticker COPX --thesis "Copper surges" --dry-run

Prerequisites:
  - Money OS screener API running on localhost:3001 (or MONEY_OS_API env var)
  - TradingAgents installed: pip install tradingagents (or clone from github.com/TauricResearch/TradingAgents)
  - LLM backend: Ollama (local, recommended) OR OpenAI API key

LLM Backend Options:
  1. Ollama (recommended — local, free, private):
     brew install ollama && ollama serve
     ollama pull gemma4:27b
     Set: TA_BACKEND=ollama TA_MODEL=gemma4:27b

  2. OpenAI (cloud, paid):
     Set: OPENAI_API_KEY=sk-... TA_MODEL=gpt-4o-mini

Environment:
  MONEY_OS_API    Base URL for screener API (default: http://localhost:3001)
  MONEY_OS_KEY    API key for screener (default: reads from .env.local)
  TA_BACKEND      LLM backend: "ollama" or "openai" (default: auto-detect)
  TA_MODEL        LLM model name (default: gemma4:27b for ollama, gpt-4o-mini for openai)
  OLLAMA_BASE_URL Ollama server URL (default: http://localhost:11434)
  OPENAI_API_KEY  Only needed if TA_BACKEND=openai
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from typing import Any

# ── Config ─────────────────────────────────────────────────────────

API_BASE = os.environ.get("MONEY_OS_API", "http://localhost:3001")
API_KEY = os.environ.get("MONEY_OS_KEY", "")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")


def detect_backend() -> tuple[str, str]:
    """Auto-detect LLM backend: prefer Ollama (local), fall back to OpenAI."""
    explicit = os.environ.get("TA_BACKEND", "").lower()

    if explicit == "ollama":
        model = os.environ.get("TA_MODEL", "gemma4:27b")
        return "ollama", model
    if explicit == "openai":
        model = os.environ.get("TA_MODEL", "gpt-4o-mini")
        return "openai", model

    # Auto-detect: check if Ollama is running
    try:
        req = urllib.request.Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            available = [m["name"] for m in data.get("models", [])]
            # Prefer gemma4 variants, then any available model
            for preferred in ["gemma4:27b", "gemma4:12b", "gemma4", "gemma3:27b", "llama3.3", "qwen2.5"]:
                if preferred in available:
                    print(f"[ta-bridge] Ollama detected with {preferred} ✓", file=sys.stderr)
                    return "ollama", preferred
            if available:
                model = available[0]
                print(f"[ta-bridge] Ollama detected, using {model}", file=sys.stderr)
                return "ollama", model
    except Exception:
        pass

    # Fall back to OpenAI if key exists
    if os.environ.get("OPENAI_API_KEY"):
        model = os.environ.get("TA_MODEL", "gpt-4o-mini")
        return "openai", model

    # No backend available
    return "none", ""


TA_BACKEND, TA_MODEL = detect_backend()


def api_get(path: str) -> dict[str, Any] | None:
    """Fetch from Money OS screener API."""
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"[ta-bridge] API error fetching {path}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[ta-bridge] Unexpected error: {e}", file=sys.stderr)
        return None


def api_post(path: str, body: dict) -> dict[str, Any] | None:
    """Post to Money OS screener API."""
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    try:
        data = json.dumps(body).encode()
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"[ta-bridge] API error posting {path}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[ta-bridge] Unexpected error: {e}", file=sys.stderr)
        return None


# ── Money OS Data Fetch ────────────────────────────────────────────

def fetch_money_os_context(ticker: str) -> dict[str, Any]:
    """Pull all available Money OS data for a ticker."""
    context: dict[str, Any] = {"ticker": ticker, "source": "money-os"}

    # Scanner results (entry/alert zones)
    scanner = api_get(f"/api/scanner?ticker={ticker}")
    if scanner and scanner.get("data"):
        results = [r for r in scanner["data"] if r.get("ticker") == ticker]
        if results:
            context["scanner"] = {
                "zone": results[0].get("zone"),
                "distance_atr": results[0].get("distanceAtr"),
                "timeframe": results[0].get("timeframe"),
            }

    # Trading signals (RSI, MACD, divergence)
    signals = api_get(f"/api/signals?ticker={ticker}")
    if signals and signals.get("data"):
        ticker_signals = [s for s in signals["data"] if s.get("ticker") == ticker]
        context["signals"] = [
            {
                "type": s.get("signalType"),
                "direction": s.get("direction"),
                "strength": s.get("strength"),
            }
            for s in ticker_signals
        ]

    # Fundamentals
    fundamentals = api_get(f"/api/fundamentals?tickers={ticker}")
    if fundamentals and fundamentals.get("data"):
        context["fundamentals"] = fundamentals["data"].get(ticker, {})

    # VIX (market fear gauge)
    vix = api_get("/api/vix")
    if vix and vix.get("data"):
        context["vix"] = vix["data"].get("close") or vix["data"].get("value")

    return context


# ── TradingAgents Integration ──────────────────────────────────────

def check_ta_available() -> bool:
    """Check if TradingAgents is importable and an LLM backend is available."""
    if TA_BACKEND == "none":
        return False
    try:
        import tradingagents  # noqa: F401
        return True
    except ImportError:
        return False


def _build_llm_config() -> dict[str, Any]:
    """Build LLM config dict for TradingAgents based on detected backend."""
    if TA_BACKEND == "ollama":
        return {
            "llm_provider": "ollama",
            "model": TA_MODEL,
            "base_url": OLLAMA_BASE_URL,
        }
    else:  # openai
        return {
            "llm_provider": "openai",
            "model": TA_MODEL,
        }


def run_ta_debate(ticker: str, thesis: str, money_os_context: dict) -> dict[str, Any]:
    """
    Run a full TradingAgents analyst debate for a single ticker + thesis claim.

    Supports Ollama (local, free) or OpenAI as LLM backend.
    Set TA_BACKEND=ollama and TA_MODEL=gemma4:27b for local execution.

    Returns structured verdict:
    {
        "ticker": "COPX",
        "verdict": "BUY" | "OVERWEIGHT" | "HOLD" | "UNDERWEIGHT" | "SELL",
        "confidence": 0.0-1.0,
        "analysts": {
            "market": {"signal": "...", "reasoning": "..."},
            "news": {"signal": "...", "reasoning": "..."},
            "fundamentals": {"signal": "...", "reasoning": "..."},
            "social": {"signal": "...", "reasoning": "..."},
        },
        "debate": {"bull_case": "...", "bear_case": "...", "winner": "bull|bear"},
        "risk": {"max_position_pct": 3.0, "stop_loss_pct": 12.0, "notes": "..."},
        "source": "tradingagents"
    }
    """
    try:
        from tradingagents.graph.trading_graph import TradingAgentsGraph

        llm_config = _build_llm_config()
        print(f"[ta-bridge] LLM backend: {TA_BACKEND} / {TA_MODEL}", file=sys.stderr)

        ta = TradingAgentsGraph(
            model=llm_config.get("model", TA_MODEL),
            research_model=llm_config.get("model", TA_MODEL),
            # Pass Ollama base_url if using Ollama
            **({"base_url": OLLAMA_BASE_URL} if TA_BACKEND == "ollama" else {}),
        )

        # Inject Money OS context as additional analyst input
        additional_context = (
            f"Money OS Scanner: {json.dumps(money_os_context.get('scanner', {}))}\n"
            f"Money OS Signals: {json.dumps(money_os_context.get('signals', []))}\n"
            f"Thesis claim being tested: {thesis}\n"
            f"Current VIX: {money_os_context.get('vix', 'unknown')}"
        )

        # Run the multi-agent debate
        result = ta.propagate(
            ticker=ticker,
            additional_context=additional_context,
        )

        # Parse TA output into our standard format
        final_state = result.get("final_state", {})
        pm_decision = final_state.get("portfolio_manager", {})

        verdict_map = {
            "strong_buy": "BUY",
            "buy": "BUY",
            "overweight": "OVERWEIGHT",
            "hold": "HOLD",
            "underweight": "UNDERWEIGHT",
            "sell": "SELL",
            "strong_sell": "SELL",
        }

        raw_verdict = pm_decision.get("decision", "hold").lower().replace(" ", "_")
        verdict = verdict_map.get(raw_verdict, "HOLD")

        return {
            "ticker": ticker,
            "verdict": verdict,
            "confidence": pm_decision.get("confidence", 0.5),
            "analysts": {
                "market": _extract_analyst(final_state, "market_analyst"),
                "news": _extract_analyst(final_state, "news_analyst"),
                "fundamentals": _extract_analyst(final_state, "fundamentals_analyst"),
                "social": _extract_analyst(final_state, "social_analyst"),
            },
            "debate": {
                "bull_case": final_state.get("bull_researcher", {}).get("summary", ""),
                "bear_case": final_state.get("bear_researcher", {}).get("summary", ""),
                "winner": "bull" if verdict in ("BUY", "OVERWEIGHT") else "bear",
            },
            "risk": {
                "max_position_pct": pm_decision.get("max_position_pct", 3.0),
                "stop_loss_pct": pm_decision.get("stop_loss_pct", 12.0),
                "notes": final_state.get("risk_committee", {}).get("notes", ""),
            },
            "source": "tradingagents",
        }

    except Exception as e:
        print(f"[ta-bridge] TradingAgents error for {ticker}: {e}", file=sys.stderr)
        return fallback_verdict(ticker, thesis, money_os_context, error=str(e))


def _extract_analyst(state: dict, analyst_key: str) -> dict[str, str]:
    """Extract analyst signal and reasoning from TA state."""
    analyst = state.get(analyst_key, {})
    return {
        "signal": analyst.get("signal", "neutral"),
        "reasoning": analyst.get("reasoning", analyst.get("summary", "No data")),
    }


# ── Fallback: Money OS Native Analysis ─────────────────────────────

def fallback_verdict(
    ticker: str, thesis: str, context: dict, error: str = ""
) -> dict[str, Any]:
    """
    When TradingAgents is unavailable, produce a verdict from Money OS data alone.
    Less sophisticated (no multi-agent debate) but still useful.
    """
    scanner = context.get("scanner", {})
    signals = context.get("signals", [])
    vix = context.get("vix")

    # Simple scoring: scanner zone + signal direction + VIX
    score = 0.0
    reasoning_parts = []

    # Scanner zone
    zone = scanner.get("zone", "")
    if zone == "ENTRY":
        score += 0.3
        reasoning_parts.append(f"In ENTRY zone ({scanner.get('distance_atr', '?')} ATR from support)")
    elif zone == "ALERT":
        score += 0.15
        reasoning_parts.append(f"In ALERT zone ({scanner.get('distance_atr', '?')} ATR from support)")
    else:
        reasoning_parts.append("Not near any support level")

    # Bull signals
    bull_signals = [s for s in signals if s.get("direction") == "bull"]
    bear_signals = [s for s in signals if s.get("direction") == "bear"]
    if bull_signals:
        score += 0.1 * len(bull_signals)
        reasoning_parts.append(f"{len(bull_signals)} bullish signal(s): {', '.join(s['type'] for s in bull_signals)}")
    if bear_signals:
        score -= 0.1 * len(bear_signals)
        reasoning_parts.append(f"{len(bear_signals)} bearish signal(s): {', '.join(s['type'] for s in bear_signals)}")

    # VIX adjustment
    if vix and float(vix) > 25:
        score -= 0.1
        reasoning_parts.append(f"Elevated VIX ({vix}) — reduce position size")

    # Clamp
    score = max(0.0, min(1.0, score + 0.5))

    # Map to verdict
    if score >= 0.7:
        verdict = "BUY"
    elif score >= 0.55:
        verdict = "OVERWEIGHT"
    elif score >= 0.45:
        verdict = "HOLD"
    elif score >= 0.3:
        verdict = "UNDERWEIGHT"
    else:
        verdict = "SELL"

    return {
        "ticker": ticker,
        "verdict": verdict,
        "confidence": round(score, 2),
        "analysts": {
            "market": {"signal": zone or "no data", "reasoning": reasoning_parts[0] if reasoning_parts else "No scanner data"},
            "news": {"signal": "not available", "reasoning": "TradingAgents not running — news analysis skipped"},
            "fundamentals": {"signal": "see data", "reasoning": json.dumps(context.get("fundamentals", {}))[:200]},
            "social": {"signal": "not available", "reasoning": "TradingAgents not running — social analysis skipped"},
        },
        "debate": {
            "bull_case": f"Thesis claim: {thesis}. Scanner: {zone}. Signals: {len(bull_signals)} bull.",
            "bear_case": f"Counter: {len(bear_signals)} bearish signals. VIX: {vix or 'unknown'}.",
            "winner": "bull" if score >= 0.5 else "bear",
        },
        "risk": {
            "max_position_pct": 3.0 if float(vix or 20) < 25 else 2.0,
            "stop_loss_pct": 12.0,
            "notes": error or "Fallback analysis — TradingAgents not available",
        },
        "source": "money-os-fallback",
    }


# ── Submit Verdict to Money OS ─────────────────────────────────────

def submit_to_trade_gate(verdict: dict, claim_score: int = 0) -> dict | None:
    """
    Convert a TA verdict into a Money OS trade proposal and submit to /api/agent.
    Only submits if verdict is BUY or OVERWEIGHT.
    """
    if verdict["verdict"] not in ("BUY", "OVERWEIGHT"):
        print(f"[ta-bridge] {verdict['ticker']}: verdict is {verdict['verdict']} — not submitting trade", file=sys.stderr)
        return None

    # Map claim score to position multiplier
    if claim_score >= 16:
        size_mult = 1.0
    elif claim_score >= 12:
        size_mult = 0.7
    elif claim_score >= 8:
        size_mult = 0.4
    else:
        print(f"[ta-bridge] {verdict['ticker']}: claim score {claim_score} too low — not submitting", file=sys.stderr)
        return None

    proposal = {
        "action": "approve",
        "proposal": {
            "ticker": verdict["ticker"],
            "side": "buy",
            "confidence": verdict["confidence"],
            "reason": (
                f"TradingAgents verdict: {verdict['verdict']} "
                f"(confidence: {verdict['confidence']:.0%}). "
                f"Claim score: {claim_score}/20 → size mult: {size_mult}x. "
                f"Bull: {verdict['debate']['bull_case'][:100]}"
            ),
            "signals": [
                f"{k}: {v['signal']}"
                for k, v in verdict.get("analysts", {}).items()
                if v.get("signal") not in ("not available", "neutral")
            ],
            "source": verdict["source"],
            "sizeMultiplier": size_mult,
            "stopLossPct": verdict["risk"]["stop_loss_pct"],
        },
    }

    return api_post("/api/agent", proposal)


# ── CLI ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="TradingAgents ↔ Money OS Bridge",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--ticker", "-t", help="Ticker symbol (e.g., COPX)")
    parser.add_argument("--thesis", help="Thesis claim text")
    parser.add_argument("--claim-score", type=int, default=0, help="Quality score from thesis-quality-analyzer (0-20)")
    parser.add_argument("--batch", action="store_true", help="Read batch JSON from stdin")
    parser.add_argument("--dry-run", action="store_true", help="Skip TA, use Money OS fallback only")
    parser.add_argument("--submit", action="store_true", help="Submit BUY verdicts to trade gate")
    parser.add_argument("--json", action="store_true", help="Output raw JSON (for piping)")
    args = parser.parse_args()

    ta_available = check_ta_available() and not args.dry_run
    if ta_available:
        print(f"[ta-bridge] TradingAgents detected ✓ (backend: {TA_BACKEND}, model: {TA_MODEL})", file=sys.stderr)
    else:
        if args.dry_run:
            reason = "dry-run mode"
        elif TA_BACKEND == "none":
            reason = "no LLM backend (run 'ollama serve' + 'ollama pull gemma4:27b', or set OPENAI_API_KEY)"
        else:
            reason = "TradingAgents not installed (pip install tradingagents)"
        print(f"[ta-bridge] {reason} — using Money OS fallback", file=sys.stderr)

    # ── Batch mode ─────────────────────────────────────────────
    if args.batch:
        input_data = json.loads(sys.stdin.read())
        claims = input_data.get("claims", [])
        results = []

        for claim in claims:
            ticker = claim["ticker"]
            thesis = claim.get("claim", claim.get("thesis", ""))
            score = claim.get("score", 0)

            print(f"\n[ta-bridge] Analyzing {ticker}: {thesis[:60]}...", file=sys.stderr)

            context = fetch_money_os_context(ticker)

            if ta_available:
                verdict = run_ta_debate(ticker, thesis, context)
            else:
                verdict = fallback_verdict(ticker, thesis, context)

            verdict["claim_score"] = score

            if args.submit and verdict["verdict"] in ("BUY", "OVERWEIGHT"):
                exec_result = submit_to_trade_gate(verdict, score)
                verdict["submitted"] = exec_result is not None

            results.append(verdict)

        output = {"results": results, "timestamp": datetime.now().isoformat(), "source": "tradingagents" if ta_available else "money-os-fallback"}
        print(json.dumps(output, indent=2))
        return

    # ── Single ticker mode ─────────────────────────────────────
    if not args.ticker:
        parser.error("--ticker is required (or use --batch for stdin JSON)")

    ticker = args.ticker.upper()
    thesis = args.thesis or f"Analyze {ticker}"

    print(f"\n[ta-bridge] Fetching Money OS data for {ticker}...", file=sys.stderr)
    context = fetch_money_os_context(ticker)

    if ta_available:
        print(f"[ta-bridge] Running TradingAgents debate for {ticker}...", file=sys.stderr)
        verdict = run_ta_debate(ticker, thesis, context)
    else:
        print(f"[ta-bridge] Running fallback analysis for {ticker}...", file=sys.stderr)
        verdict = fallback_verdict(ticker, thesis, context)

    verdict["claim_score"] = args.claim_score

    if args.submit and verdict["verdict"] in ("BUY", "OVERWEIGHT"):
        exec_result = submit_to_trade_gate(verdict, args.claim_score)
        verdict["submitted"] = exec_result is not None

    # Output
    if args.json:
        print(json.dumps(verdict, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"  VERDICT: {ticker} — {verdict['verdict']}")
        print(f"  Confidence: {verdict['confidence']:.0%}")
        print(f"  Source: {verdict['source']}")
        print(f"{'='*60}")
        print(f"\n  Analysts:")
        for name, data in verdict.get("analysts", {}).items():
            print(f"    {name:15s} → {data['signal']:12s}  {data['reasoning'][:80]}")
        print(f"\n  Debate winner: {verdict['debate']['winner']}")
        print(f"  Bull: {verdict['debate']['bull_case'][:120]}")
        print(f"  Bear: {verdict['debate']['bear_case'][:120]}")
        print(f"\n  Risk: max {verdict['risk']['max_position_pct']}% position, {verdict['risk']['stop_loss_pct']}% stop")
        if verdict["risk"].get("notes"):
            print(f"  Notes: {verdict['risk']['notes'][:100]}")
        print()


if __name__ == "__main__":
    main()
