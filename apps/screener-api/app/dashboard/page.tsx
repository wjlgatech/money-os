"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────

interface ScanResult {
  ticker: string;
  asset: string;
  price: string;
  signalType: string;
  level: string;
  distanceAtr: string;
  zone: string;
  timeframe: string;
  direction: string;
  sector: string | null;
}

interface Signal {
  ticker: string;
  timeframe: string;
  signalType: string;
  direction: string;
  detail: string;
  signalDate: string;
}

interface Position {
  symbol: string;
  qty: number;
  avgEntry: number;
  currentPrice: number;
  unrealizedPnl: number;
}

// ── Dashboard ────────────────────────────────────────────────

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";
const authHeaders: HeadersInit = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

function apiFetch(path: string) {
  return fetch(path, { headers: authHeaders }).then((r) => r.json());
}

export default function Dashboard() {
  const [scanner, setScanner] = useState<ScanResult[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [vix, setVix] = useState<{ date: string; close: string } | null>(null);
  const [portfolio, setPortfolio] = useState<{
    backend: string; equity: number; cash: number; positions: Position[];
  } | null>(null);
  const [pipeline, setPipeline] = useState<Array<{ jobName: string; status: string; completed: number; total: number }>>([]);
  const [universe, setUniverse] = useState<{ total: number }>({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanFilter, setScanFilter] = useState<"entry,alert" | "entry" | "alert">("entry,alert");
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scanRes, sigRes, vixRes, portRes, pipeRes, uniRes] = await Promise.allSettled([
        apiFetch(`/api/scanner?filter=${scanFilter}`),
        apiFetch("/api/signals?days=7"),
        apiFetch("/api/vix"),
        apiFetch("/api/broker"),
        apiFetch("/api/pipeline/status"),
        apiFetch("/api/universe"),
      ]);

      if (scanRes.status === "fulfilled") setScanner(scanRes.value.results ?? []);
      if (sigRes.status === "fulfilled") setSignals(sigRes.value.signals ?? []);
      if (vixRes.status === "fulfilled") setVix(vixRes.value);
      if (portRes.status === "fulfilled") setPortfolio(portRes.value);
      if (pipeRes.status === "fulfilled") setPipeline(pipeRes.value.jobs ?? []);
      if (uniRes.status === "fulfilled") setUniverse(uniRes.value);

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [scanFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const vixLevel = vix ? Number(vix.close) : 0;
  const vixColor = vixLevel < 15 ? "#4ade80" : vixLevel < 20 ? "#a3e635" : vixLevel < 25 ? "#facc15" : vixLevel < 30 ? "#fb923c" : "#ef4444";
  const vixLabel = vixLevel < 15 ? "Calm" : vixLevel < 20 ? "Normal" : vixLevel < 25 ? "Nervous" : vixLevel < 30 ? "Fearful" : "Panic";

  return (
    <div style={{ background: "#0a0a0f", color: "#e4e4e7", minHeight: "100vh", fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 13 }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #1e1e2e", background: "#0f0f18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Money OS</span>
          <span style={{ color: "#6b7280", fontSize: 11 }}>v4.0</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Stat label="VIX" value={vix ? Number(vix.close).toFixed(1) : "—"} color={vixColor} sub={vixLabel} />
          <Stat label="Universe" value={String(universe.total)} color="#818cf8" />
          <Stat label="Backend" value={portfolio?.backend?.toUpperCase() ?? "—"} color={portfolio?.backend === "alpaca" ? "#4ade80" : "#facc15"} />
          <button onClick={fetchAll} style={{ background: "#1e1e2e", border: "1px solid #2e2e3e", color: "#a1a1aa", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>
            {loading ? "..." : "Refresh"}
          </button>
          <span style={{ color: "#52525b", fontSize: 10 }}>{lastRefresh}</span>
        </div>
      </header>

      {error && <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "8px 20px", fontSize: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#1e1e2e" }}>
        {/* Portfolio */}
        <Panel title={`Portfolio — $${portfolio?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}`} subtitle={`Cash: $${portfolio?.cash?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}`}>
          {portfolio?.positions && portfolio.positions.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#6b7280", fontSize: 10, textAlign: "left" }}>
                  <th style={th}>Ticker</th><th style={th}>Qty</th><th style={th}>Avg Entry</th><th style={th}>Current</th><th style={th}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((p) => (
                  <tr key={p.symbol} style={{ borderTop: "1px solid #1e1e2e" }}>
                    <td style={td}><span style={{ color: "#e2e8f0", fontWeight: 600 }}>{p.symbol}</span></td>
                    <td style={td}>{p.qty}</td>
                    <td style={td}>${p.avgEntry.toFixed(2)}</td>
                    <td style={td}>${p.currentPrice.toFixed(2)}</td>
                    <td style={{ ...td, color: p.unrealizedPnl >= 0 ? "#4ade80" : "#ef4444" }}>
                      {p.unrealizedPnl >= 0 ? "+" : ""}${p.unrealizedPnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#52525b", padding: 12, textAlign: "center" }}>No open positions</div>
          )}
        </Panel>

        {/* Signals */}
        <Panel title={`Signals — ${signals.length} (7d)`}>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {signals.length > 0 ? signals.slice(0, 15).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "6px 12px", borderTop: i > 0 ? "1px solid #1e1e2e" : "none", alignItems: "center" }}>
                <span style={{ color: s.direction === "bull" ? "#4ade80" : "#ef4444", fontWeight: 700, width: 14 }}>
                  {s.direction === "bull" ? "↑" : "↓"}
                </span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, width: 50 }}>{s.ticker}</span>
                <Badge text={s.signalType.replace("_", " ")} color={s.direction === "bull" ? "#065f46" : "#7f1d1d"} />
                <span style={{ color: "#6b7280", fontSize: 11, flex: 1 }}>{s.detail?.slice(0, 50)}</span>
              </div>
            )) : <div style={{ color: "#52525b", padding: 12, textAlign: "center" }}>No signals</div>}
          </div>
        </Panel>

        {/* Scanner */}
        <Panel title={`Scanner — ${scanner.length} results`} subtitle={
          <div style={{ display: "flex", gap: 4 }}>
            {(["entry,alert", "entry", "alert"] as const).map((f) => (
              <button key={f} onClick={() => setScanFilter(f)} style={{
                background: scanFilter === f ? "#3b82f6" : "#1e1e2e",
                border: "1px solid #2e2e3e",
                color: scanFilter === f ? "#fff" : "#6b7280",
                padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontSize: 10,
              }}>{f.toUpperCase()}</button>
            ))}
          </div>
        }>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#6b7280", fontSize: 10, textAlign: "left" }}>
                  <th style={th}>Ticker</th><th style={th}>Price</th><th style={th}>Zone</th><th style={th}>Type</th><th style={th}>Dir</th><th style={th}>TF</th><th style={th}>ATR</th>
                </tr>
              </thead>
              <tbody>
                {scanner.slice(0, 20).map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #1e1e2e" }}>
                    <td style={td}><span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.ticker}</span></td>
                    <td style={td}>${Number(r.price).toFixed(2)}</td>
                    <td style={td}><Badge text={r.zone} color={r.zone === "ENTRY" ? "#065f46" : "#78350f"} /></td>
                    <td style={td}><Badge text={r.signalType} color="#1e1b4b" /></td>
                    <td style={td}><span style={{ color: r.direction === "support" ? "#4ade80" : "#ef4444" }}>{r.direction}</span></td>
                    <td style={td}>{r.timeframe}</td>
                    <td style={td}>{Number(r.distanceAtr).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Pipeline */}
        <Panel title="Pipeline Status">
          {pipeline.map((j) => (
            <div key={j.jobName} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderTop: "1px solid #1e1e2e" }}>
              <span style={{ color: "#a1a1aa" }}>{j.jobName}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#6b7280", fontSize: 11 }}>{j.completed}/{j.total}</span>
                <Badge text={j.status} color={j.status === "idle" ? "#1e3a5f" : j.status === "running" ? "#065f46" : "#7f1d1d"} />
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <footer style={{ textAlign: "center", padding: 8, color: "#3f3f46", fontSize: 10, borderTop: "1px solid #1e1e2e" }}>
        Money OS v4.0 — {universe.total} tickers — Screener API on localhost:3001
      </footer>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────

function Panel({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0f0f18", minHeight: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #1e1e2e" }}>
        <span style={{ color: "#a1a1aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
        {subtitle && <span style={{ color: "#6b7280", fontSize: 11 }}>{typeof subtitle === "string" ? subtitle : subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#52525b" }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      background: color, color: "#e2e8f0",
      padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 500,
    }}>{text}</span>
  );
}

const th: React.CSSProperties = { padding: "4px 12px", fontWeight: 500, borderBottom: "1px solid #1e1e2e" };
const td: React.CSSProperties = { padding: "5px 12px", fontSize: 12 };
