"use client";

import { useEffect, useState, useCallback } from "react";

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";
const authHeaders: HeadersInit = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

function apiFetch(path: string) {
  return fetch(path, { headers: authHeaders }).then((r) => r.json());
}
function apiPost(path: string, body: unknown) {
  return fetch(path, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
}

// ── Types ────────────────────────────────────────────────────

interface Briefing {
  headline: string;
  market: { regime: { regime: string; confidence: number }; vix: number; headline: string };
  actions: string[];
  pendingApprovals: Array<{
    id: string; ticker: string; shares: number; price: number;
    stopLoss: number; takeProfit: number; confidence: string;
    signals: string[]; reason: string; riskAmount: number; riskPct: number;
    aiContext: string;
  }>;
  watching: Array<{ ticker: string; reason: string; estimatedDays: number }>;
  portfolio: {
    equity: number; portfolioValue: number; cash: number; totalPnl: number; totalPnlPct: number;
    positions: Array<{
      symbol: string; qty: number; avgEntry: number; currentPrice: number;
      unrealizedPnl: number; pnlPct: number; posValue: number; portfolioPct: number; context: string;
    }>;
  };
  performance: { winRate: number; totalTrades: number; insight: string; bestSector: string | null; worstSector: string | null };
  selectionProcess: {
    universe: number;
    description: string;
    steps: Array<{ step: string; result: string }>;
    dataFreshness: string;
    priceSource: string;
  };
  connections: Record<string, string>;
  rules: Record<string, unknown>;
  agentActive: boolean;
  lastCycle: string | null;
}

// ── Dashboard V2 ─────────────────────────────────────────────

function Expandable({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid #1e1e2e" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", color: "#6b7280", padding: "8px 12px", cursor: "pointer", textAlign: "left", fontSize: 11, display: "flex", justifyContent: "space-between" }}>
        <span>{title}</span><span>{open ? "▼" : "▶"}</span>
      </button>
      {open && <div style={{ padding: "0 12px 12px" }}>{children}</div>}
    </div>
  );
}

export default function DashboardV2() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchInsight, setSearchInsight] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [drawerTicker, setDrawerTicker] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing", { headers: authHeaders });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error ?? `API error ${res.status}. Check SCREENER_API_TOKEN in .env.local`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setBriefing(data); }
    } catch (err) {
      setError(`Cannot reach API: ${(err as Error).message}. Is the server running?`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleApprove = async (proposal: Briefing["pendingApprovals"][0]) => {
    setApproving(proposal.id);
    try {
      await apiPost("/api/agent", { action: "approve", proposal });
      showToast(`${proposal.ticker} order submitted`);
      await refresh();
    } catch { showToast(`Failed to approve ${proposal.ticker}`); }
    finally { setApproving(null); }
  };

  const handleSkip = async (id: string) => {
    try {
      await apiPost("/api/agent", { action: "skip", proposalId: id });
      showToast("Proposal skipped");
      await refresh();
    } catch { showToast("Failed to skip"); }
  };

  const handleSearch = async () => {
    const ticker = searchInput.trim().toUpperCase();
    if (!ticker) return;
    setSearching(true);
    setSearchInsight(null);
    try {
      // Fire both in parallel: scanner zones + fundamentals + AI insight
      const [scannerData, insightData] = await Promise.allSettled([
        apiFetch(`/api/opportunities?search=${ticker}`),
        apiFetch(`/api/fundamentals/insight?ticker=${ticker}`),
      ]);
      setSearchResult(scannerData.status === "fulfilled" ? scannerData.value : null);
      const insight = insightData.status === "fulfilled" ? insightData.value : null;
      // Keep the error message so the UI can show it instead of showing nothing
      setSearchInsight(insight);
    } catch { showToast("Search failed"); }
    setSearching(false);
  };

  const handleQuickAdd = async () => {
    // Parse: "10 TSLA" or "TSLA 10" or "50 shares AAPL at 142"
    const match = quickAdd.match(/(\d+)\s*(?:shares?\s+)?([A-Za-z]+)|([A-Za-z]+)\s+(\d+)/);
    if (!match) { showToast("Format: '10 TSLA' or 'TSLA 10'"); return; }
    const qty = Number(match[1] ?? match[4]);
    const ticker = (match[2] ?? match[3]).toUpperCase();
    try {
      await apiPost("/api/portfolio", { action: "add", positions: [{ ticker, qty, type: "stock" }] });
      showToast(`Added ${qty} ${ticker} to your portfolio`);
      setQuickAdd("");
      await refresh();
    } catch { showToast("Failed to add position"); }
  };

  if (loading && !briefing) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "#a1a1aa", fontSize: 15, marginBottom: 8 }}>Loading Money OS...</div>
          <div style={{ color: "#52525b", fontSize: 12 }}>Connecting to agent and market data</div>
        </div>
      </div>
    );
  }

  if (error && !briefing) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "#ef4444", fontSize: 15, marginBottom: 12 }}>Connection Error</div>
          <div style={{ color: "#a1a1aa", fontSize: 12, marginBottom: 16, maxWidth: 500, margin: "0 auto" }}>{error}</div>
          <button onClick={refresh} style={{ ...btnStyle, background: "#3b82f6", color: "#fff", padding: "8px 20px" }}>Retry</button>
        </div>
      </div>
    );
  }

  const b = briefing;
  const displayEquity = b?.portfolio?.portfolioValue ?? b?.portfolio?.equity ?? 0;
  const pnlColor = (b?.portfolio?.totalPnl ?? 0) >= 0 ? "#4ade80" : "#ef4444";
  const vixVal = b?.market?.vix ?? 0;
  const vixColor = vixVal === 0 ? "#52525b" : vixVal < 15 ? "#4ade80" : vixVal < 20 ? "#a3e635" : vixVal < 25 ? "#facc15" : vixVal < 30 ? "#fb923c" : "#ef4444";
  const vixLabel = vixVal === 0 ? "N/A" : vixVal < 15 ? "Calm" : vixVal < 20 ? "Normal" : vixVal < 25 ? "Nervous" : vixVal < 30 ? "Fearful" : "Panic";

  // Onboarding: show getting started if no agent data
  const isNewUser = !b?.agentActive && (b?.portfolio?.positions?.length ?? 0) === 0;

  return (
    <div style={pageStyle}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: "#1e3a5f", color: "#93c5fd", padding: "10px 20px", borderRadius: 8, fontSize: 13, zIndex: 100, border: "1px solid #3b82f6", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
          {toast}
        </div>
      )}
      {/* Error banner */}
      {error && briefing && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "8px 24px", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={refresh} style={{ ...btnStyle, background: "#991b1b", color: "#fca5a5", fontSize: 10 }}>Retry</button>
        </div>
      )}
      {/* ── Header ──────────────────────────────────────── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #1e1e2e", background: "#0c0c14" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Money OS</span>
          <span style={{ fontSize: 10, color: "#3b82f6", background: "#1e3a5f", padding: "2px 8px", borderRadius: 3 }}>AGENT</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <HeaderStat label="Portfolio" value={`$${displayEquity.toLocaleString(undefined, { minimumFractionDigits: 0 })}`} sub={`${b?.portfolio?.positions?.length ?? 0} positions`} subColor="#818cf8" />
          <HeaderStat label="VIX" value={vixVal === 0 ? "—" : vixVal.toFixed(1)} sub={vixLabel} subColor={vixColor} />
          <HeaderStat label="Regime" value={(b?.market?.regime?.regime ?? "—").toUpperCase()} sub={`${((b?.market?.regime?.confidence ?? 0) * 100).toFixed(0)}%`} subColor="#818cf8" />
          <button onClick={refresh} style={btnStyle}>{loading ? "..." : "Refresh"}</button>
        </div>
      </header>

      {/* Search + Quick Add bar */}
      <div style={{ display: "flex", gap: 8, padding: "8px 24px", borderBottom: "1px solid #1e1e2e", background: "#0c0c14", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search any ticker (TSLA, BTC, AMZN...)"
            style={{ flex: 1, background: "#111119", border: "1px solid #2e2e3e", color: "#e2e8f0", padding: "6px 12px", borderRadius: 5, fontSize: 12, outline: "none" }} />
          <button onClick={handleSearch} disabled={searching} style={{ ...btnStyle, background: "#3b82f6", color: "#fff" }}>{searching ? "..." : "Search"}</button>
        </div>
        <div style={{ width: 1, height: 24, background: "#2e2e3e" }} />
        <div style={{ display: "flex", gap: 4 }}>
          <input value={quickAdd} onChange={(e) => setQuickAdd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            placeholder="Quick add: 10 TSLA"
            style={{ width: 140, background: "#111119", border: "1px solid #2e2e3e", color: "#e2e8f0", padding: "6px 12px", borderRadius: 5, fontSize: 12, outline: "none" }} />
          <button onClick={handleQuickAdd} style={{ ...btnStyle, background: "#065f46", color: "#4ade80" }}>+ Add</button>
        </div>
      </div>

      {/* Search Result — fundamentals + AI insight + scanner zones */}
      {(searchResult || searchInsight) && (
        <div style={{ padding: "16px 24px", borderBottom: "2px solid #1e1e2e", background: "#0c0c16" }}>
          {/* ── Header row ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setDrawerTicker(searchResult?.search ?? searchInsight?.raw?.ticker)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#818cf8", textDecoration: "underline dotted" }}>
                  {searchResult?.search ?? searchInsight?.raw?.ticker}
                </span>
              </button>
              {searchInsight?.raw?.companyName && (
                <span style={{ color: "#a1a1aa", fontSize: 13 }}>{searchInsight.raw.companyName}</span>
              )}
              {searchInsight?.raw?.sector && (
                <span style={{ background: "#1e1e2e", color: "#818cf8", padding: "2px 8px", borderRadius: 3, fontSize: 10 }}>
                  {searchInsight.raw.sector}
                </span>
              )}
              {searchResult?.owned && (
                <span style={{ background: "#065f46", color: "#4ade80", padding: "2px 8px", borderRadius: 3, fontSize: 10 }}>YOU OWN THIS</span>
              )}
              {searching && <span style={{ color: "#52525b", fontSize: 11 }}>Loading AI...</span>}
            </div>
            <button onClick={() => { setSearchResult(null); setSearchInsight(null); }} style={{ ...btnStyle, fontSize: 10 }}>Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: searchInsight ? "220px 1fr 1fr" : "1fr", gap: 16 }}>
            {/* ── Column 1: Raw numbers ── */}
            {searchInsight?.raw && (
              <div style={{ background: "#111119", borderRadius: 8, padding: 12, border: "1px solid #1e1e2e", fontSize: 11 }}>
                <div style={{ ...sectionTitle, marginBottom: 8 }}>FUNDAMENTALS</div>
                <FundStat label="Price" value={searchInsight.raw.price != null ? `$${Number(searchInsight.raw.price).toFixed(2)}` : "—"} />
                <FundStat label="Market Cap" value={searchInsight.raw.marketCapFormatted ?? "—"} />
                <FundStat label="P/E" value={searchInsight.raw.pe != null ? Number(searchInsight.raw.pe).toFixed(1) : "—"} />
                <FundStat label="P/S" value={searchInsight.raw.ps != null ? Number(searchInsight.raw.ps).toFixed(1) : "—"} />
                <FundStat label="Net Margin" value={searchInsight.raw.netMargin != null ? `${searchInsight.raw.netMargin}%` : "—"} highlight={searchInsight.raw.netMargin != null ? (searchInsight.raw.netMargin > 20 ? "good" : searchInsight.raw.netMargin > 0 ? "neutral" : "bad") : undefined} />
                <FundStat label="Gross Margin" value={searchInsight.raw.grossMargin != null ? `${searchInsight.raw.grossMargin}%` : "—"} />
                <FundStat label="ROE" value={searchInsight.raw.roe != null ? `${searchInsight.raw.roe}%` : "—"} highlight={searchInsight.raw.roe != null ? (searchInsight.raw.roe > 15 ? "good" : searchInsight.raw.roe > 0 ? "neutral" : "bad") : undefined} />
                <FundStat label="Debt/Eq" value={searchInsight.raw.debtToEquity != null ? Number(searchInsight.raw.debtToEquity).toFixed(2) : "—"} />
                <FundStat label="Beta" value={searchInsight.raw.beta != null ? Number(searchInsight.raw.beta).toFixed(2) : "—"} />
                {searchInsight.raw.dividendYield != null && searchInsight.raw.dividendYield > 0 && (
                  <FundStat label="Div Yield" value={`${searchInsight.raw.dividendYield}%`} highlight="good" />
                )}
                {searchInsight.raw.range52w && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #1e1e2e", color: "#52525b" }}>
                    52w: <span style={{ color: "#6b7280" }}>{searchInsight.raw.range52w}</span>
                  </div>
                )}
                {searchInsight.position?.qty > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e1e2e" }}>
                    <div style={{ ...sectionTitle, marginBottom: 6 }}>YOUR POSITION</div>
                    <FundStat label="Shares" value={String(searchInsight.position.qty)} />
                    <FundStat label="Avg Cost" value={`$${searchInsight.position.avgCost.toFixed(2)}`} />
                    <FundStat label="P&L" value={`${searchInsight.position.unrealizedPnlPct >= 0 ? "+" : ""}${searchInsight.position.unrealizedPnlPct.toFixed(1)}%`} highlight={searchInsight.position.unrealizedPnlPct >= 0 ? "good" : "bad"} />
                    <FundStat label="Portfolio" value={`${searchInsight.position.portfolioPct.toFixed(1)}%`} />
                  </div>
                )}
              </div>
            )}

            {/* ── Column 2: AI Insight or error ── */}
            {searchInsight?.error && !searchInsight?.raw && (
              <div style={{ background: "#111119", borderRadius: 8, padding: 12, border: "1px solid #1e1e2e", gridColumn: "2 / span 2" }}>
                <div style={{ ...sectionTitle, marginBottom: 8 }}>FUNDAMENTALS</div>
                <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6 }}>{searchInsight.error}</div>
              </div>
            )}
            {searchInsight?.aiInsight && (
              <div style={{ background: "#0c1020", borderRadius: 8, padding: 12, border: "1px solid #1e3a5f" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>AI INSIGHT</span>
                  <span style={{ fontSize: 9, color: "#3b82f6", background: "#1e3a5f", padding: "1px 6px", borderRadius: 3 }}>Claude</span>
                </div>
                <div style={{ color: "#c7d2fe", fontSize: 12, lineHeight: 1.7 }}>
                  {searchInsight.aiInsight}
                </div>
                {searchInsight.raw?.description && (
                  <div style={{ marginTop: 10, color: "#52525b", fontSize: 10, lineHeight: 1.6, borderTop: "1px solid #1e1e2e", paddingTop: 8 }}>
                    {searchInsight.raw.description}...
                  </div>
                )}
              </div>
            )}

            {/* ── Column 3: Scanner zones ── */}
            <div style={{ background: "#111119", borderRadius: 8, padding: 12, border: "1px solid #1e1e2e" }}>
              <div style={{ ...sectionTitle, marginBottom: 8 }}>TECHNICAL SCANNER</div>
              {searchResult?.scanResults?.length > 0 ? (
                <>
                  {searchResult.scanResults.slice(0, 4).map((r: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: "#a1a1aa", padding: "4px 0", borderTop: i > 0 ? "1px solid #1e1e2e" : "none" }}>
                      <span style={{ color: r.zone === "ENTRY" ? "#4ade80" : "#facc15", fontWeight: 600 }}>{r.zone}</span>
                      {" · "}{r.direction} {r.timeframe}
                      {" · "}{Number(r.distanceAtr).toFixed(1)} ATR away
                      {" · "}${Number(r.price).toFixed(2)}
                    </div>
                  ))}
                  {searchResult.signals?.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {searchResult.signals.map((s: any, i: number) => (
                        <span key={i} style={{ background: s.direction === "bull" ? "#065f46" : "#7f1d1d", color: "#e2e8f0", padding: "2px 6px", borderRadius: 3, fontSize: 10 }}>
                          {s.direction === "bull" ? "↑" : "↓"} {s.signalType}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: "#52525b", fontSize: 11, lineHeight: 1.6 }}>
                  Not in scanner universe.
                  <div style={{ marginTop: 6, color: "#3f3f46" }}>
                    Run <span style={{ fontFamily: "monospace", color: "#818cf8" }}>npx tsx scripts/run-pipeline.ts {searchResult?.search ?? ""}</span> to add it.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", minHeight: "calc(100vh - 52px)" }}>
        {/* ── Main Column ─────────────────────────────── */}
        <div style={{ borderRight: "1px solid #1e1e2e", overflowY: "auto" }}>

          {/* Onboarding for new users */}
          {isNewUser && (
            <div style={{ padding: "24px", borderBottom: "1px solid #1e1e2e", background: "#0c1020" }}>
              <div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 600, marginBottom: 12 }}>Welcome to Money OS</div>
              <div style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                Get started in 3 steps:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { step: "1", title: "Import your portfolio", desc: "In Claude, say /import-portfolio and share a screenshot of your broker. Works with Fidelity, Coinbase, Moomoo, Kraken — any broker.", done: false },
                  { step: "2", title: "Run your first scan", desc: "Run: npx tsx scripts/run-pipeline.ts (fetches market data + computes signals for 130 tickers)", done: false },
                  { step: "3", title: "Review and approve", desc: "The agent will propose trades based on your portfolio. Approve, skip, or ask 'why?' for each one.", done: false },
                ].map((s) => (
                  <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.done ? "#065f46" : "#1e3a5f", color: s.done ? "#4ade80" : "#93c5fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                      <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Briefing */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={{ fontSize: 15, color: "#e2e8f0", lineHeight: 1.6, marginBottom: 8 }}>
              {b?.headline ?? "Welcome. Run the agent pipeline to start receiving trade proposals."}
            </div>
            {(b?.actions?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12 }}>
                {b!.actions.map((a, i) => (
                  <div key={i} style={{ color: "#a1a1aa", fontSize: 12, padding: "3px 0", display: "flex", gap: 6 }}>
                    <span style={{ color: a.startsWith("Bought") || a.startsWith("Sold") ? "#4ade80" : a.startsWith("Alert") ? "#facc15" : "#6b7280" }}>
                      {a.startsWith("Bought") ? "✅" : a.startsWith("Sold") ? "🔴" : a.startsWith("Alert") ? "⚠️" : "⏭️"}
                    </span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approvals */}
          {(b?.pendingApprovals?.length ?? 0) > 0 && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e1e2e" }}>
              <div style={sectionTitle}>NEEDS YOUR APPROVAL</div>
              {b!.pendingApprovals.map((p) => (
                <div key={p.id} style={{ background: "#111119", borderRadius: 8, padding: 16, marginTop: 12, border: "1px solid #1e1e2e" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <button onClick={() => setDrawerTicker(p.ticker)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#818cf8", textDecoration: "underline dotted" }}>{p.ticker}</span>
                      </button>
                      <span style={{ color: "#6b7280", marginLeft: 8, fontSize: 12 }}>BUY {p.shares} shares @ ${p.price.toFixed(2)}</span>
                      <ConfBadge confidence={p.confidence} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleApprove(p)} disabled={approving === p.id} style={{ ...btnStyle, background: "#065f46", color: "#4ade80", fontWeight: 600 }}>
                        {approving === p.id ? "..." : "APPROVE"}
                      </button>
                      <button onClick={() => handleSkip(p.id)} style={{ ...btnStyle, background: "#1e1e2e" }}>SKIP</button>
                    </div>
                  </div>
                  <div style={{ color: "#d4d4d8", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
                    {p.aiContext}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#6b7280" }}>
                    <span>Stop: <span style={{ color: "#ef4444" }}>${p.stopLoss.toFixed(2)}</span></span>
                    <span>Target: <span style={{ color: "#4ade80" }}>${p.takeProfit.toFixed(2)}</span></span>
                    <span>Risk: ${p.riskAmount} ({p.riskPct}%)</span>
                    {p.signals.length > 0 && <span>Signals: {p.signals.join(", ")}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selection Process (expandable transparency) */}
          {b?.selectionProcess && (
            <div style={{ padding: "0 24px 0", borderBottom: "1px solid #1e1e2e" }}>
              <Expandable title={`How were these ${b.pendingApprovals?.length ?? 0} selected? (from ${b.selectionProcess.universe} tickers)`}>
                <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                  <div style={{ color: "#a1a1aa", marginBottom: 8 }}>
                    Universe: <span style={{ color: "#e2e8f0" }}>{b.selectionProcess.description}</span>
                  </div>
                  {b.selectionProcess.steps.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, color: "#6b7280" }}>
                      <span style={{ color: "#3b82f6" }}>{i + 1}.</span>
                      <span>{s.step} → <span style={{ color: "#a1a1aa" }}>{s.result}</span></span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, color: "#52525b", fontSize: 11 }}>
                    {b.selectionProcess.dataFreshness} | Prices: {b.selectionProcess.priceSource}
                  </div>
                </div>
              </Expandable>

              <Expandable title={`Import portfolio — ${Object.values(b.connections ?? {}).filter((s) => (s as string).includes("Connected")).length} connected`}>
                <ImportPanel connections={b.connections} showToast={showToast} onRefresh={refresh} />
              </Expandable>
            </div>
          )}

          {/* Watching */}
          {(b?.watching?.length ?? 0) > 0 && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e1e2e" }}>
              <div style={sectionTitle}>WATCHING</div>
              {b!.watching.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", alignItems: "center", borderTop: i > 0 ? "1px solid #1e1e2e" : "none" }}>
                  <span style={{ color: "#facc15" }}>👀</span>
                  <button onClick={() => setDrawerTicker(w.ticker)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: 55, textAlign: "left" }}>
                    <span style={{ color: "#818cf8", fontWeight: 600, textDecoration: "underline dotted" }}>{w.ticker}</span>
                  </button>
                  <span style={{ color: "#a1a1aa", fontSize: 12, flex: 1 }}>{w.reason}</span>
                  <span style={{ color: "#6b7280", fontSize: 11 }}>~{w.estimatedDays}d</span>
                </div>
              ))}
            </div>
          )}

          {/* Positions */}
          <div style={{ padding: "16px 24px" }}>
            <div style={sectionTitle}>POSITIONS ({b?.portfolio?.positions?.length ?? 0})</div>
            {(b?.portfolio?.positions?.length ?? 0) > 0 ? b!.portfolio.positions.map((p) => (
              <div key={p.symbol} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid #1e1e2e", alignItems: "center" }}>
                <div style={{ width: 55 }}>
                  <button onClick={() => setDrawerTicker(p.symbol)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                    <div style={{ color: "#818cf8", fontWeight: 700, textDecoration: "underline dotted" }}>{p.symbol}</div>
                  </button>
                  <div style={{ color: "#6b7280", fontSize: 10 }}>{p.qty} shares</div>
                </div>
                <div style={{ flex: 1 }}>
                  {/* P&L bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1, height: 6, background: "#1e1e2e", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.min(Math.abs(p.pnlPct) * 5, 100)}%`,
                        height: "100%",
                        background: p.pnlPct >= 0 ? "#4ade80" : "#ef4444",
                        borderRadius: 3,
                      }} />
                    </div>
                    <span style={{ color: p.pnlPct >= 0 ? "#4ade80" : "#ef4444", fontSize: 12, fontWeight: 600, width: 55, textAlign: "right" }}>
                      {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 11 }}>{p.context}</div>
                </div>
                <div style={{ textAlign: "right", width: 80 }}>
                  <div style={{ color: "#a1a1aa", fontSize: 12 }}>${p.currentPrice.toFixed(2)}</div>
                  <div style={{ color: p.unrealizedPnl >= 0 ? "#4ade80" : "#ef4444", fontSize: 11 }}>
                    {p.unrealizedPnl >= 0 ? "+" : ""}${p.unrealizedPnl.toFixed(2)}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ color: "#52525b", padding: 16, textAlign: "center" }}>No positions. The agent will propose entries when opportunities arise.</div>
            )}
          </div>

          {/* Fundamentals Panel */}
          <FundamentalsPanel positions={b?.portfolio?.positions ?? []} />
        </div>

        {/* ── Right Column: Insight + Status ──────────── */}
        <div style={{ display: "flex", flexDirection: "column", background: "#0a0a12" }}>
          {/* Agent Insight */}
          <div style={{ padding: "16px 16px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={sectionTitle}>AGENT INSIGHT</div>
            <div style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>
              {b?.performance?.insight ?? "No insights yet. Run the pipeline to generate data."}
            </div>
            {(b?.performance?.totalTrades ?? 0) > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <MiniStat label="Win Rate" value={`${(b?.performance?.winRate ?? 0).toFixed(0)}%`} />
                <MiniStat label="Trades" value={String(b?.performance?.totalTrades ?? 0)} />
                {b?.performance?.bestSector && <MiniStat label="Best" value={b.performance.bestSector} />}
              </div>
            )}
          </div>

          {/* Market Context */}
          <div style={{ padding: "16px 16px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={sectionTitle}>MARKET</div>
            <div style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>
              {b?.market?.headline ?? "No market data. Run pipeline first."}
            </div>
          </div>

          {/* Data Freshness */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={sectionTitle}>STATUS</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6, lineHeight: 1.8 }}>
              <div>Last cycle: <span style={{ color: "#a1a1aa" }}>{b?.lastCycle ? new Date(b.lastCycle).toLocaleString() : "Never"}</span></div>
              <div>Agent: <span style={{ color: b?.agentActive ? "#4ade80" : "#6b7280" }}>{b?.agentActive ? "Active" : "Not started"}</span></div>
              <div>Backend: <span style={{ color: "#818cf8" }}>{b?.portfolio ? "Alpaca Paper" : "—"}</span></div>
            </div>
          </div>

          {/* AI Chat — real Claude, not simulation */}
          <AIChatPanel briefing={b} />
        </div>
      </div>

      {/* Ticker Detail Drawer */}
      {drawerTicker && <TickerDrawer ticker={drawerTicker} onClose={() => setDrawerTicker(null)} />}
    </div>
  );
}

// ── Components ───────────────────────────────────────────────

function HeaderStat({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{value}</div>
      <div style={{ fontSize: 10, color: subColor }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#111119", padding: "4px 8px", borderRadius: 4 }}>
      <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ConfBadge({ confidence }: { confidence: string }) {
  const color = confidence === "high" ? "#065f46" : confidence === "medium" ? "#78350f" : "#1e1e2e";
  const text = confidence === "high" ? "HIGH" : confidence === "medium" ? "MED" : "LOW";
  const dot = confidence === "high" ? "🟢" : confidence === "medium" ? "🟡" : "⚪";
  return (
    <span style={{ background: color, color: "#e2e8f0", padding: "1px 6px", borderRadius: 3, fontSize: 10, marginLeft: 8 }}>
      {dot} {text}
    </span>
  );
}

// ── Styles ───────────────────────────────────────────────────

// ── Import Panel ─────────────────────────────────────────────

function ImportPanel({ connections, showToast, onRefresh }: {
  connections: Record<string, string> | undefined;
  showToast: (msg: string) => void;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const mimeType = file.type || "image/png";

        const res = await fetch("/api/ai/screenshot", {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
        });
        const data = await res.json();

        if (data.holdings?.length > 0) {
          // Save to portfolio
          await fetch("/api/portfolio", {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", positions: data.holdings.map((h: any) => ({
              ticker: h.ticker, qty: h.qty, avgCost: h.avgCost, type: h.type ?? "stock",
            })) }),
          });
          showToast(`Imported ${data.holdings.length} positions from screenshot`);
          onRefresh();
        } else {
          showToast("No positions found in screenshot. Try a clearer image of your positions page.");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast("Screenshot import failed");
      setUploading(false);
    }
  };

  return (
    <div style={{ fontSize: 12 }}>
      {/* Connection status */}
      {connections && Object.entries(connections).map(([name, status]) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ color: "#a1a1aa", textTransform: "capitalize" }}>{name}</span>
          <span style={{ color: (status as string).includes("Connected") ? "#4ade80" : "#6b7280", fontSize: 11 }}>{status as string}</span>
        </div>
      ))}

      {/* Import methods */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Screenshot upload */}
        <label style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: "#111119", borderRadius: 6, border: "1px dashed #2e2e3e",
          cursor: "pointer", transition: "border-color 0.2s",
        }}>
          <span style={{ fontSize: 20 }}>📸</span>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 500 }}>
              {uploading ? "Extracting holdings..." : "Upload broker screenshot"}
            </div>
            <div style={{ color: "#6b7280", fontSize: 10 }}>
              Fidelity, Moomoo, Coinbase, Kraken — any positions page
            </div>
          </div>
          <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display: "none" }} disabled={uploading} />
        </label>

        {/* Quick add reminder */}
        <div style={{ padding: "8px 12px", background: "#111119", borderRadius: 6, border: "1px solid #1e1e2e" }}>
          <div style={{ color: "#a1a1aa", fontSize: 11 }}>
            Or use the <span style={{ color: "#4ade80" }}>Quick Add</span> bar above: type <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>10 TSLA</span> to add positions manually
          </div>
        </div>

        {/* API connection hint */}
        <div style={{ padding: "8px 12px", background: "#111119", borderRadius: 6, border: "1px solid #1e1e2e" }}>
          <div style={{ color: "#6b7280", fontSize: 10, lineHeight: 1.5 }}>
            For live sync: add API keys for Coinbase, Kraken, or Moomoo in <span style={{ fontFamily: "monospace", color: "#818cf8" }}>.env.local</span>. For Fidelity/Schwab/Vanguard: set up Plaid.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ticker Detail Drawer ──────────────────────────────────────
// Slides in from the right. Three tabs: Chart | Fundamentals | AI Analysis.
// Triggered by clicking any underlined ticker symbol anywhere on the dashboard.

function TickerDrawer({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const [tab, setTab] = useState<"chart" | "fundamentals" | "ai">("chart");
  const [bars, setBars] = useState<Array<{ date: string; close: number; high: number; low: number }>>([]);
  const [trendlines, setTrendlines] = useState<Array<{ slope: number; intercept: number; direction: string; timeframe: string; lineType: string }>>([]);
  const [insight, setInsight] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightLoaded, setInsightLoaded] = useState(false);

  // Load chart data immediately
  useEffect(() => {
    setLoadingChart(true);
    setBars([]);
    setTrendlines([]);
    setInsight(null);
    setInsightLoaded(false);

    Promise.allSettled([
      apiFetch(`/api/bars?ticker=${ticker}&timeframe=daily&limit=120`),
      apiFetch(`/api/trendlines?ticker=${ticker}`),
    ]).then(([barsRes, tlRes]) => {
      if (barsRes.status === "fulfilled") {
        // Normalize: DB returns ts as timestamp, close as numeric string
        const raw = barsRes.value.bars ?? [];
        const normalized = raw
          .map((b: any) => ({
            date: typeof b.ts === "string" ? b.ts.slice(0, 10) : String(b.ts ?? ""),
            close: Number(b.close),
            high: Number(b.high ?? b.close),
            low: Number(b.low ?? b.close),
          }))
          .filter((b: any) => b.close > 0)
          .reverse(); // API returns desc, chart needs asc
        setBars(normalized);
      }
      if (tlRes.status === "fulfilled") setTrendlines(tlRes.value.trendlines ?? []);
      setLoadingChart(false);
    });
  }, [ticker]);

  // Lazy-load fundamentals + AI when tab is switched
  const loadInsight = async () => {
    if (insightLoaded) return;
    setLoadingInsight(true);
    try {
      const data = await apiFetch(`/api/fundamentals/insight?ticker=${ticker}`);
      setInsight(data);
    } catch {}
    setLoadingInsight(false);
    setInsightLoaded(true);
  };

  const switchTab = (t: typeof tab) => {
    setTab(t);
    if (t === "fundamentals" || t === "ai") loadInsight();
  };

  const TAB = { background: "none", border: "none", cursor: "pointer", padding: "8px 16px", fontSize: 12, fontWeight: 600 };
  const activeTab = { ...TAB, color: "#e2e8f0", borderBottom: "2px solid #818cf8" };
  const inactiveTab = { ...TAB, color: "#52525b", borderBottom: "2px solid transparent" };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />

      {/* Drawer */}
      <div style={{ position: "fixed", top: 0, right: 0, width: 640, height: "100vh", background: "#0d0d15", borderLeft: "1px solid #1e1e2e", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Drawer header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111119" }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>{ticker}</span>
            {insight?.raw?.companyName && <span style={{ color: "#a1a1aa", fontSize: 13, marginLeft: 10 }}>{insight.raw.companyName}</span>}
            {insight?.raw?.sector && <span style={{ background: "#1e1e2e", color: "#818cf8", padding: "2px 8px", borderRadius: 3, fontSize: 10, marginLeft: 8 }}>{insight.raw.sector}</span>}
            {insight?.raw?.price != null && <span style={{ color: "#e2e8f0", fontSize: 14, marginLeft: 12, fontWeight: 600 }}>${Number(insight.raw.price).toFixed(2)}</span>}
          </div>
          <button onClick={onClose} style={{ ...btnStyle, fontSize: 16, padding: "4px 10px" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e1e2e", background: "#0d0d15" }}>
          <button onClick={() => switchTab("chart")} style={tab === "chart" ? activeTab : inactiveTab}>CHART</button>
          <button onClick={() => switchTab("fundamentals")} style={tab === "fundamentals" ? activeTab : inactiveTab}>FUNDAMENTALS</button>
          <button onClick={() => switchTab("ai")} style={tab === "ai" ? activeTab : inactiveTab}>AI ANALYSIS</button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>

          {/* ── Chart Tab ── */}
          {tab === "chart" && (
            loadingChart ? (
              <div style={{ color: "#52525b", fontSize: 12, paddingTop: 40, textAlign: "center" }}>Loading price data...</div>
            ) : bars.length === 0 ? (
              <div style={{ color: "#52525b", fontSize: 12, paddingTop: 40, textAlign: "center" }}>
                No price data for {ticker}.
                <div style={{ marginTop: 8, fontFamily: "monospace", color: "#818cf8", fontSize: 11 }}>
                  Run: npx tsx scripts/run-pipeline.ts {ticker}
                </div>
              </div>
            ) : (
              <PriceChart ticker={ticker} bars={bars} trendlines={trendlines} />
            )
          )}

          {/* ── Fundamentals Tab ── */}
          {tab === "fundamentals" && (
            <div>
              {loadingInsight && <div style={{ color: "#52525b", fontSize: 12, paddingTop: 20, textAlign: "center" }}>Loading...</div>}
              {!loadingInsight && insight?.error && !insight?.raw && (
                <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6 }}>{insight.error}</div>
              )}
              {!loadingInsight && insight?.raw && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ ...sectionTitle, marginBottom: 12 }}>VALUATION</div>
                    <FundRow label="Market Cap" value={insight.raw.marketCapFormatted ?? "—"} />
                    <FundRow label="P/E" value={insight.raw.pe != null ? Number(insight.raw.pe).toFixed(1) : "—"} />
                    <FundRow label="P/S" value={insight.raw.ps != null ? Number(insight.raw.ps).toFixed(1) : "—"} />
                    <FundRow label="P/B" value={insight.raw.pb != null ? Number(insight.raw.pb).toFixed(1) : "—"} />
                    <FundRow label="Beta" value={insight.raw.beta != null ? Number(insight.raw.beta).toFixed(2) : "—"} />
                    <FundRow label="52w Range" value={insight.raw.range52w ?? "—"} />

                    <div style={{ ...sectionTitle, marginTop: 20, marginBottom: 12 }}>PROFITABILITY</div>
                    <FundRow label="Net Margin" value={insight.raw.netMargin != null ? `${insight.raw.netMargin}%` : "—"} color={insight.raw.netMargin > 20 ? "#4ade80" : insight.raw.netMargin > 0 ? "#facc15" : "#ef4444"} />
                    <FundRow label="Gross Margin" value={insight.raw.grossMargin != null ? `${insight.raw.grossMargin}%` : "—"} />
                    <FundRow label="ROE" value={insight.raw.roe != null ? `${insight.raw.roe}%` : "—"} color={insight.raw.roe > 15 ? "#4ade80" : insight.raw.roe > 0 ? "#facc15" : "#ef4444"} />
                    <FundRow label="Debt/Equity" value={insight.raw.debtToEquity != null ? Number(insight.raw.debtToEquity).toFixed(2) : "—"} />
                    {insight.raw.dividendYield > 0 && <FundRow label="Div Yield" value={`${insight.raw.dividendYield}%`} color="#4ade80" />}
                  </div>
                  <div>
                    {insight.position?.qty > 0 && (
                      <>
                        <div style={{ ...sectionTitle, marginBottom: 12 }}>YOUR POSITION</div>
                        <FundRow label="Shares" value={String(insight.position.qty)} />
                        <FundRow label="Avg Cost" value={`$${insight.position.avgCost.toFixed(2)}`} />
                        <FundRow label="Current" value={`$${insight.position.currentPrice.toFixed(2)}`} />
                        <FundRow label="Value" value={`$${insight.position.positionValue.toLocaleString()}`} />
                        <FundRow label="P&L" value={`${insight.position.unrealizedPnlPct >= 0 ? "+" : ""}${insight.position.unrealizedPnlPct.toFixed(1)}%`} color={insight.position.unrealizedPnlPct >= 0 ? "#4ade80" : "#ef4444"} />
                        <FundRow label="Portfolio %" value={`${insight.position.portfolioPct.toFixed(1)}%`} />
                      </>
                    )}
                    {insight.raw.description && (
                      <>
                        <div style={{ ...sectionTitle, marginTop: insight.position?.qty > 0 ? 20 : 0, marginBottom: 12 }}>ABOUT</div>
                        <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.7 }}>{insight.raw.description}...</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AI Analysis Tab ── */}
          {tab === "ai" && (
            <div>
              {loadingInsight && <div style={{ color: "#52525b", fontSize: 12, paddingTop: 20, textAlign: "center" }}>Claude is thinking...</div>}
              {!loadingInsight && insight?.aiInsight && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>AI ANALYSIS</span>
                    <span style={{ fontSize: 10, color: "#3b82f6", background: "#1e3a5f", padding: "2px 8px", borderRadius: 3 }}>Claude Sonnet</span>
                    <span style={{ fontSize: 10, color: "#52525b" }}>Personalized to your portfolio</span>
                  </div>
                  <div style={{ color: "#c7d2fe", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                    {insight.aiInsight}
                  </div>
                  {/* Fundamentals context strip */}
                  {insight.raw && (
                    <div style={{ marginTop: 24, padding: 16, background: "#111119", borderRadius: 8, border: "1px solid #1e1e2e", display: "flex", flexWrap: "wrap", gap: 16 }}>
                      {[
                        { label: "Market Cap", v: insight.raw.marketCapFormatted },
                        { label: "Net Margin", v: insight.raw.netMargin != null ? `${insight.raw.netMargin}%` : "—" },
                        { label: "P/E", v: insight.raw.pe != null ? Number(insight.raw.pe).toFixed(1) : "—" },
                        { label: "P/S", v: insight.raw.ps != null ? Number(insight.raw.ps).toFixed(1) : "—" },
                        { label: "ROE", v: insight.raw.roe != null ? `${insight.raw.roe}%` : "—" },
                        { label: "Debt/Equity", v: insight.raw.debtToEquity != null ? Number(insight.raw.debtToEquity).toFixed(2) : "—" },
                      ].map(({ label, v }) => v && v !== "—" && (
                        <div key={label} style={{ fontSize: 11 }}>
                          <span style={{ color: "#52525b" }}>{label}: </span>
                          <span style={{ color: "#a1a1aa", fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!loadingInsight && !insight?.aiInsight && insight?.error && (
                <div style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6, paddingTop: 20 }}>{insight.error}</div>
              )}
              {!loadingInsight && !insight && (
                <div style={{ color: "#52525b", fontSize: 12, paddingTop: 20 }}>No analysis available.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Price Chart (SVG) ─────────────────────────────────────────
// Simple SVG line chart with trendlines projected to current date.

function PriceChart({
  ticker,
  bars,
  trendlines,
}: {
  ticker: string;
  bars: Array<{ date: string; close: number; high: number; low: number }>;
  trendlines: Array<{ slope: number; intercept: number; direction: string; timeframe: string; lineType: string }>;
}) {
  const W = 580, H = 300, PAD = { top: 20, right: 20, bottom: 32, left: 55 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const closes = bars.map((b) => b.close);
  const minP = Math.min(...closes) * 0.97;
  const maxP = Math.max(...closes) * 1.03;

  const xScale = (i: number) => (i / (bars.length - 1)) * innerW;
  const yScale = (p: number) => innerH - ((p - minP) / (maxP - minP)) * innerH;

  // Price line
  const linePath = bars.map((b, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(b.close).toFixed(1)}`).join(" ");

  // Current price reference
  const latestClose = closes[closes.length - 1];

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const p = minP + ((maxP - minP) * i) / (yTicks - 1);
    return { p, y: yScale(p) };
  });

  // X-axis labels (show ~5 dates)
  const xLabelIdxs = [0, Math.floor(bars.length * 0.25), Math.floor(bars.length * 0.5), Math.floor(bars.length * 0.75), bars.length - 1];

  // Trendlines projected
  const tlColors: Record<string, string> = {
    support: "#4ade80", resistance: "#ef4444",
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "#52525b", marginBottom: 8 }}>
        {bars.length} trading days · Latest: <span style={{ color: "#e2e8f0" }}>${latestClose.toFixed(2)}</span>
        {trendlines.length > 0 && <span style={{ marginLeft: 8 }}>· {trendlines.length} trendlines</span>}
      </div>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines */}
          {yLabels.map(({ y }, i) => (
            <line key={i} x1={0} y1={y.toFixed(1)} x2={innerW} y2={y.toFixed(1)} stroke="#1e1e2e" strokeWidth={1} />
          ))}

          {/* Y-axis labels */}
          {yLabels.map(({ p, y }, i) => (
            <text key={i} x={-6} y={(y + 4).toFixed(1)} textAnchor="end" fill="#52525b" fontSize={9}>
              ${p.toFixed(0)}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabelIdxs.map((idx) => (
            <text key={idx} x={xScale(idx).toFixed(1)} y={(innerH + 18).toFixed(1)} textAnchor="middle" fill="#52525b" fontSize={9}>
              {bars[idx]?.date?.slice(5) ?? ""}
            </text>
          ))}

          {/* Trendlines */}
          {trendlines.slice(0, 6).map((tl, i) => {
            // Project line: y = slope * x_index + intercept
            // x_index maps to bar index relative to start
            // We approximate: intercept is the price at bar 0
            const x0 = 0, x1 = innerW;
            const p0 = tl.intercept;
            const p1 = tl.intercept + tl.slope * (bars.length - 1);
            const y0 = yScale(p0), y1 = yScale(p1);
            const color = tlColors[tl.lineType] ?? (tl.direction === "bull" ? "#4ade80" : "#ef4444");
            return (
              <line key={i} x1={x0} y1={y0.toFixed(1)} x2={x1.toFixed(1)} y2={y1.toFixed(1)}
                stroke={color} strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
            );
          })}

          {/* Area fill */}
          <defs>
            <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${linePath} L${innerW},${innerH} L0,${innerH} Z`} fill={`url(#grad-${ticker})`} />

          {/* Price line */}
          <path d={linePath} fill="none" stroke="#818cf8" strokeWidth={1.5} />

          {/* Latest price dot */}
          <circle cx={xScale(bars.length - 1).toFixed(1)} cy={yScale(latestClose).toFixed(1)} r={3} fill="#e2e8f0" />
        </g>
      </svg>

      {/* Trendline legend */}
      {trendlines.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {trendlines.slice(0, 6).map((tl, i) => {
            const color = tl.lineType === "support" ? "#4ade80" : "#ef4444";
            return (
              <span key={i} style={{ fontSize: 10, color: "#6b7280" }}>
                <span style={{ color, marginRight: 3 }}>—</span>
                {tl.lineType} {tl.timeframe} {tl.direction}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Simple full-width label:value row for the Fundamentals tab
function FundRow({ label, value, color = "#a1a1aa" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1a1a27", fontSize: 12 }}>
      <span style={{ color: "#52525b" }}>{label}</span>
      <span style={{ color, fontWeight: value !== "—" ? 500 : 400 }}>{value}</span>
    </div>
  );
}

// ── Fundamentals Panel ────────────────────────────────────────
// Raw numbers on the left. AI coaching on the right.
// Lazy: each ticker loads on expand, not on page load.

interface FundamentalsData {
  raw: {
    companyName: string; sector: string; industry: string; marketCapFormatted: string;
    price: number; beta: number | null; range52w: string | null;
    pe: number | null; ps: number | null; pb: number | null;
    netMargin: number | null; grossMargin: number | null; roe: number | null;
    debtToEquity: number | null; dividendYield: number | null;
    description: string | null;
  };
  position: {
    qty: number; avgCost: number; currentPrice: number;
    unrealizedPnlPct: number; positionValue: number; portfolioPct: number;
  };
  aiInsight: string | null;
}

function FundamentalsPanel({ positions }: { positions: Array<{ symbol: string; qty: number }> }) {
  const [open, setOpen] = useState(false);
  const tickers = [...new Set(positions.map((p) => p.symbol))].slice(0, 22);

  return (
    <div style={{ borderTop: "2px solid #1e1e2e" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", background: "none", border: "none", color: "#818cf8", padding: "12px 24px", cursor: "pointer", textAlign: "left", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <span style={{ fontWeight: 600 }}>FUNDAMENTALS</span>
          <span style={{ color: "#52525b", marginLeft: 8, fontSize: 10 }}>Raw data + AI interpretation — {tickers.length} positions</span>
        </div>
        <span style={{ color: "#52525b" }}>{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 24px 24px" }}>
          {tickers.length === 0 && (
            <div style={{ color: "#52525b", fontSize: 12, padding: "16px 0" }}>No positions to analyze. Import your portfolio first.</div>
          )}
          {tickers.map((ticker) => (
            <FundamentalsCard key={ticker} ticker={ticker} />
          ))}
        </div>
      )}
    </div>
  );
}

function FundamentalsCard({ ticker }: { ticker: string }) {
  const [data, setData] = useState<FundamentalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fundamentals/insight?ticker=${ticker}`, { headers: authHeaders });
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch {
      setError("Failed to load");
    }
    setLoading(false);
  };

  const toggle = () => {
    setExpanded(!expanded);
    if (!expanded && !data) load();
  };

  const pnlColor = data ? (data.position.unrealizedPnlPct >= 0 ? "#4ade80" : "#ef4444") : "#6b7280";

  return (
    <div style={{ borderTop: "1px solid #1e1e2e", marginTop: 0 }}>
      <button
        onClick={toggle}
        style={{ width: "100%", background: "none", border: "none", padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
      >
        <span style={{ color: "#e2e8f0", fontWeight: 700, width: 55 }}>{ticker}</span>
        {data && (
          <>
            <span style={{ color: "#6b7280", fontSize: 11, flex: 1 }}>{data.raw.companyName} · {data.raw.sector}</span>
            <span style={{ color: pnlColor, fontSize: 11 }}>
              {data.position.qty > 0
                ? `${data.position.unrealizedPnlPct >= 0 ? "+" : ""}${data.position.unrealizedPnlPct.toFixed(1)}% · ${data.position.portfolioPct.toFixed(1)}% of portfolio`
                : "Not owned"}
            </span>
          </>
        )}
        {loading && <span style={{ color: "#52525b", fontSize: 11 }}>Loading...</span>}
        {error && <span style={{ color: "#ef4444", fontSize: 11 }}>{error}</span>}
        {!data && !loading && !error && <span style={{ color: "#52525b", fontSize: 11 }}>Click to load fundamentals</span>}
        <span style={{ color: "#3f3f46", fontSize: 11 }}>{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && data && (
        <div style={{ paddingBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left: Raw numbers */}
          <div style={{ background: "#111119", borderRadius: 8, padding: 14, border: "1px solid #1e1e2e" }}>
            <div style={{ ...sectionTitle, marginBottom: 10 }}>RAW DATA</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11 }}>
              <FundStat label="Market Cap" value={data.raw.marketCapFormatted} />
              <FundStat label="P/E" value={data.raw.pe != null ? data.raw.pe.toFixed(1) : "—"} />
              <FundStat label="P/S" value={data.raw.ps != null ? data.raw.ps.toFixed(1) : "—"} />
              <FundStat label="P/B" value={data.raw.pb != null ? data.raw.pb.toFixed(1) : "—"} />
              <FundStat label="Net Margin" value={data.raw.netMargin != null ? `${data.raw.netMargin}%` : "—"} highlight={data.raw.netMargin != null ? (data.raw.netMargin > 20 ? "good" : data.raw.netMargin > 0 ? "neutral" : "bad") : undefined} />
              <FundStat label="Gross Margin" value={data.raw.grossMargin != null ? `${data.raw.grossMargin}%` : "—"} />
              <FundStat label="ROE" value={data.raw.roe != null ? `${data.raw.roe}%` : "—"} highlight={data.raw.roe != null ? (data.raw.roe > 15 ? "good" : data.raw.roe > 0 ? "neutral" : "bad") : undefined} />
              <FundStat label="Debt/Equity" value={data.raw.debtToEquity != null ? data.raw.debtToEquity.toFixed(2) : "—"} highlight={data.raw.debtToEquity != null ? (data.raw.debtToEquity < 0.5 ? "good" : data.raw.debtToEquity < 2 ? "neutral" : "bad") : undefined} />
              <FundStat label="Div Yield" value={data.raw.dividendYield != null ? `${data.raw.dividendYield}%` : "—"} />
              <FundStat label="Beta" value={data.raw.beta != null ? data.raw.beta.toFixed(2) : "—"} />
              {data.raw.range52w && <div style={{ gridColumn: "1/-1" }}><FundStat label="52w Range" value={data.raw.range52w} /></div>}
            </div>
            {data.position.qty > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #1e1e2e" }}>
                <div style={{ ...sectionTitle, marginBottom: 6 }}>YOUR POSITION</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11 }}>
                  <FundStat label="Shares" value={String(data.position.qty)} />
                  <FundStat label="Avg Cost" value={`$${data.position.avgCost.toFixed(2)}`} />
                  <FundStat label="Current" value={`$${data.position.currentPrice.toFixed(2)}`} />
                  <FundStat label="Value" value={`$${data.position.positionValue.toLocaleString()}`} />
                  <FundStat label="P&L" value={`${data.position.unrealizedPnlPct >= 0 ? "+" : ""}${data.position.unrealizedPnlPct.toFixed(1)}%`} highlight={data.position.unrealizedPnlPct >= 0 ? "good" : "bad"} />
                  <FundStat label="Portfolio %" value={`${data.position.portfolioPct.toFixed(1)}%`} />
                </div>
              </div>
            )}
          </div>

          {/* Right: AI coaching */}
          <div style={{ background: "#0c1020", borderRadius: 8, padding: 14, border: "1px solid #1e3a5f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>AI INSIGHT</span>
              <span style={{ fontSize: 9, color: "#3b82f6", background: "#1e3a5f", padding: "1px 6px", borderRadius: 3 }}>Claude</span>
            </div>
            {data.aiInsight ? (
              <div style={{ color: "#c7d2fe", fontSize: 12, lineHeight: 1.7 }}>
                {data.aiInsight}
              </div>
            ) : (
              <div style={{ color: "#52525b", fontSize: 11 }}>
                AI interpretation unavailable — check MONEY_OS_ANTHROPIC_KEY in .env.local
              </div>
            )}
            {data.raw.description && (
              <div style={{ marginTop: 12, color: "#52525b", fontSize: 10, lineHeight: 1.6, borderTop: "1px solid #1e1e2e", paddingTop: 10 }}>
                {data.raw.description}...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FundStat({ label, value, highlight }: { label: string; value: string; highlight?: "good" | "neutral" | "bad" }) {
  const valueColor = highlight === "good" ? "#4ade80" : highlight === "bad" ? "#ef4444" : highlight === "neutral" ? "#facc15" : "#a1a1aa";
  return (
    <div style={{ padding: "2px 0" }}>
      <span style={{ color: "#52525b" }}>{label}: </span>
      <span style={{ color: valueColor, fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  background: "#0a0a0f", color: "#e4e4e7", minHeight: "100vh",
  fontFamily: "-apple-system, 'SF Pro Text', 'Inter', sans-serif", fontSize: 13,
};

const sectionTitle: React.CSSProperties = {
  color: "#52525b", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5,
};

const btnStyle: React.CSSProperties = {
  background: "#1e1e2e", border: "1px solid #2e2e3e", color: "#a1a1aa",
  padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontSize: 11,
};

// ── AI Chat Panel (real Claude, not simulation) ──────────────

function AIChatPanel({ briefing }: { briefing: Briefing | null }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = async (text?: string) => {
    const question = text ?? input.trim();
    if (!question) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: {
            portfolioEquity: briefing?.portfolio?.portfolioValue ?? 0,
            positions: briefing?.portfolio?.positions?.map((p) => ({ symbol: p.symbol, pnlPct: p.pnlPct })) ?? [],
            pendingApprovals: briefing?.pendingApprovals?.map((p) => ({ ticker: p.ticker, reason: p.reason })) ?? [],
            regime: briefing?.market?.regime?.regime ?? "unknown",
            vix: briefing?.market?.vix ?? 0,
            userLevel: "intermediate",
          },
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.answer ?? data.error ?? "No response" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Failed to reach AI. Check that the server is running." }]);
    }
    setThinking(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e2e" }}>
        <div style={sectionTitle}>ASK AI</div>
        <div style={{ color: "#52525b", fontSize: 10, marginTop: 4 }}>Powered by Claude — real reasoning about YOUR portfolio</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", minHeight: 120 }}>
        {messages.length === 0 && (
          <div style={{ color: "#3f3f46", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            Ask anything about your portfolio, the market, or a specific stock.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            padding: "8px 12px", marginTop: 6, borderRadius: 8, fontSize: 12, lineHeight: 1.6,
            background: m.role === "user" ? "#1e3a5f" : "#111119",
            color: m.role === "user" ? "#93c5fd" : "#d4d4d8",
            marginLeft: m.role === "user" ? 30 : 0,
            marginRight: m.role === "ai" ? 10 : 0,
          }}>
            {m.text}
          </div>
        ))}
        {thinking && (
          <div style={{ padding: "8px 12px", marginTop: 6, color: "#6b7280", fontSize: 11, fontStyle: "italic" }}>
            Claude is thinking...
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div style={{ display: "flex", gap: 4, padding: "4px 12px", flexWrap: "wrap" }}>
        {["Why these stocks?", "What's my risk?", "Should I approve?", "Market outlook"].map((q) => (
          <button key={q} onClick={() => send(q)} style={{
            background: "none", border: "1px solid #2e2e3e", color: "#6b7280",
            padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10,
          }}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything..."
          style={{
            flex: 1, background: "#111119", border: "1px solid #2e2e3e", color: "#e2e8f0",
            padding: "8px 12px", borderRadius: 6, fontSize: 12, outline: "none",
          }}
        />
        <button onClick={() => send()} disabled={thinking} style={{ ...btnStyle, background: "#3b82f6", color: "#fff" }}>
          {thinking ? "..." : "Ask"}
        </button>
      </div>
    </div>
  );
}
