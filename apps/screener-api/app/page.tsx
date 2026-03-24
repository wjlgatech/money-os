export default function HealthCheck() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>Money OS Screener API</h1>
      <p>Status: running</p>
      <p>Version: 0.1.0</p>
      <h2>Endpoints</h2>
      <ul>
        <li>GET /api/pipeline/status</li>
        <li>GET /api/universe</li>
        <li>GET /api/bars?ticker=AAPL&timeframe=daily</li>
        <li>GET /api/trendlines?ticker=AAPL</li>
        <li>GET /api/sr-levels?ticker=AAPL</li>
        <li>GET /api/scanner?filter=entry</li>
        <li>GET /api/signals?limit=50</li>
        <li>GET /api/vix</li>
      </ul>
    </main>
  );
}
