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
  const [approving, setApproving] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/briefing");
      if (!data.error) setBriefing(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleApprove = async (proposal: Briefing["pendingApprovals"][0]) => {
    setApproving(proposal.id);
    await apiPost("/api/agent", { action: "approve", proposal });
    await refresh();
    setApproving(null);
  };

  const handleSkip = async (id: string) => {
    // Just remove from UI — agent will expire it
    if (briefing) {
      setBriefing({ ...briefing, pendingApprovals: briefing.pendingApprovals.filter((p) => p.id !== id) });
    }
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatInput("");

    // Simulate agent response based on keywords
    setTimeout(() => {
      let response: string;
      if (msg.toLowerCase().includes("why") && briefing?.pendingApprovals[0]) {
        const p = briefing.pendingApprovals[0];
        response = `${p.ticker} is at ${p.reason}. ${p.aiContext} The thesis: support levels that have held multiple times tend to hold again. But it's not guaranteed — that's why we have a stop-loss at $${p.stopLoss}.`;
      } else if (msg.toLowerCase().includes("risk")) {
        response = `Your total portfolio risk is ${briefing?.portfolio?.totalPnlPct?.toFixed(2) ?? 0}%. Max position size is 3% ($${((briefing?.portfolio?.equity ?? 100000) * 0.03).toFixed(0)}). Every trade has a stop-loss — worst case per trade is ~$150-200.`;
      } else if (msg.toLowerCase().includes("regime") || msg.toLowerCase().includes("market")) {
        response = briefing?.market?.headline ?? "Run the pipeline first to get market data.";
      } else if (msg.toLowerCase().includes("performance") || msg.toLowerCase().includes("how am i")) {
        const perf = briefing?.performance;
        response = perf ? `${perf.totalTrades} trades total, ${perf.winRate.toFixed(1)}% win rate. ${perf.insight}` : "No trades yet.";
      } else {
        response = `I understand you're asking about "${msg}". For deep analysis, use the Claude plugin directly — say this exact question to Claude with /money-os. The dashboard handles approvals and monitoring; Claude handles strategy and coaching.`;
      }
      setChatMessages((prev) => [...prev, { role: "agent", text: response }]);
    }, 500);
  };

  if (loading && !briefing) {
    return <div style={pageStyle}><div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading agent briefing...</div></div>;
  }

  const b = briefing;
  const displayEquity = b?.portfolio?.portfolioValue ?? b?.portfolio?.equity ?? 0;
  const pnlColor = (b?.portfolio?.totalPnl ?? 0) >= 0 ? "#4ade80" : "#ef4444";
  const vixVal = b?.market?.vix ?? 0;
  const vixColor = vixVal < 15 ? "#4ade80" : vixVal < 20 ? "#a3e635" : vixVal < 25 ? "#facc15" : vixVal < 30 ? "#fb923c" : "#ef4444";

  return (
    <div style={pageStyle}>
      {/* ── Header ──────────────────────────────────────── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #1e1e2e", background: "#0c0c14" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Money OS</span>
          <span style={{ fontSize: 10, color: "#3b82f6", background: "#1e3a5f", padding: "2px 8px", borderRadius: 3 }}>AGENT</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <HeaderStat label="Portfolio" value={`$${displayEquity.toLocaleString(undefined, { minimumFractionDigits: 0 })}`} sub={`${b?.portfolio?.positions?.length ?? 0} positions`} subColor="#818cf8" />
          <HeaderStat label="VIX" value={vixVal.toFixed(1)} sub={vixVal < 20 ? "Normal" : vixVal < 25 ? "Nervous" : vixVal < 30 ? "Fearful" : "Panic"} subColor={vixColor} />
          <HeaderStat label="Regime" value={(b?.market?.regime?.regime ?? "—").toUpperCase()} sub={`${((b?.market?.regime?.confidence ?? 0) * 100).toFixed(0)}%`} subColor="#818cf8" />
          <button onClick={refresh} style={btnStyle}>{loading ? "..." : "Refresh"}</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", minHeight: "calc(100vh - 52px)" }}>
        {/* ── Main Column ─────────────────────────────── */}
        <div style={{ borderRight: "1px solid #1e1e2e", overflowY: "auto" }}>

          {/* Agent Briefing */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={{ fontSize: 15, color: "#e2e8f0", lineHeight: 1.6, marginBottom: 8 }}>
              {b?.headline ?? "No briefing available. Run the agent cycle first."}
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

        {/* ── Right Column: Chat + Insight ────────────── */}
        <div style={{ display: "flex", flexDirection: "column", background: "#0a0a12" }}>
          {/* Performance */}
          <div style={{ padding: "16px 16px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={sectionTitle}>AGENT INSIGHT</div>
            <div style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>
              {b?.performance?.insight ?? "No insights yet."}
            </div>
            {(b?.performance?.totalTrades ?? 0) > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <MiniStat label="Win Rate" value={`${(b?.performance?.winRate ?? 0).toFixed(0)}%`} />
                <MiniStat label="Trades" value={String(b?.performance?.totalTrades ?? 0)} />
                {b?.performance?.bestSector && <MiniStat label="Best" value={b.performance.bestSector} />}
              </div>
            )}
          </div>

          {/* Chat */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 0 12px 0" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {chatMessages.length === 0 && (
                <div style={{ color: "#3f3f46", fontSize: 12, textAlign: "center", marginTop: 20 }}>
                  Ask me anything about your portfolio, strategies, or the market.
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{
                  padding: "8px 12px", marginTop: 8, borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                  background: m.role === "user" ? "#1e3a5f" : "#111119",
                  color: m.role === "user" ? "#93c5fd" : "#d4d4d8",
                  marginLeft: m.role === "user" ? 40 : 0,
                  marginRight: m.role === "agent" ? 40 : 0,
                }}>
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{ padding: "0 12px" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  placeholder="Ask me anything..."
                  style={{
                    flex: 1, background: "#111119", border: "1px solid #2e2e3e", color: "#e2e8f0",
                    padding: "8px 12px", borderRadius: 6, fontSize: 12, outline: "none",
                  }}
                />
                <button onClick={handleChat} style={{ ...btnStyle, background: "#3b82f6", color: "#fff" }}>Send</button>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {["Why this stock?", "What's my risk?", "Market outlook", "How am I doing?"].map((q) => (
                  <button key={q} onClick={() => { setChatInput(q); }} style={{
                    background: "none", border: "1px solid #2e2e3e", color: "#6b7280",
                    padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10,
                  }}>{q}</button>
                ))}
              </div>
            </div>
          </div>
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
