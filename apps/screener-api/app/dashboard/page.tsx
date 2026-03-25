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
  const [searching, setSearching] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");

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
    try {
      const data = await apiFetch(`/api/opportunities?search=${ticker}`);
      setSearchResult(data);
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

      {/* Search Result (overlay) */}
      {searchResult && (
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #1e1e2e", background: "#0f0f18" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{searchResult.search}</span>
              {searchResult.owned && <span style={{ marginLeft: 8, background: "#065f46", color: "#4ade80", padding: "2px 8px", borderRadius: 3, fontSize: 10 }}>YOU OWN THIS</span>}
              {!searchResult.inUniverse && <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 10 }}>Not in scanner universe</span>}
            </div>
            <button onClick={() => setSearchResult(null)} style={{ ...btnStyle, fontSize: 10 }}>Close</button>
          </div>
          {searchResult.scanResults?.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              {searchResult.scanResults.slice(0, 3).map((r: any, i: number) => (
                <div key={i} style={{ fontSize: 12, color: "#a1a1aa", padding: "3px 0" }}>
                  {r.zone} zone | {r.direction} {r.timeframe} | {Number(r.distanceAtr).toFixed(1)} ATR away | ${Number(r.price).toFixed(2)}
                </div>
              ))}
              {searchResult.signals?.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {searchResult.signals.map((s: any, i: number) => (
                    <span key={i} style={{ background: s.direction === "bull" ? "#065f46" : "#7f1d1d", color: "#e2e8f0", padding: "1px 6px", borderRadius: 3, fontSize: 10, marginRight: 4 }}>
                      {s.direction === "bull" ? "↑" : "↓"} {s.signalType}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
              No scanner data for {searchResult.search}. {!searchResult.inUniverse ? "Add it to the universe to start tracking." : "No entry/alert zones detected currently."}
            </div>
          )}
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
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{p.ticker}</span>
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

              <Expandable title="Portfolio connections">
                <div style={{ fontSize: 12 }}>
                  {b.connections && Object.entries(b.connections).map(([name, status]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ color: "#a1a1aa", textTransform: "capitalize" }}>{name}</span>
                      <span style={{ color: (status as string).includes("Connected") ? "#4ade80" : "#6b7280", fontSize: 11 }}>{status as string}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "#111119", borderRadius: 6, border: "1px solid #1e1e2e" }}>
                    <div style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 4 }}>Import your real portfolio:</div>
                    <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.6 }}>
                      In Claude, say <span style={{ color: "#3b82f6" }}>/import-portfolio</span> and share a screenshot of your Fidelity, Moomoo, Coinbase, or Kraken positions page. AI vision extracts all holdings automatically — no API keys or OAuth needed.
                    </div>
                  </div>
                </div>
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
                  <span style={{ color: "#e2e8f0", fontWeight: 600, width: 55 }}>{w.ticker}</span>
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
                  <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{p.symbol}</div>
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
