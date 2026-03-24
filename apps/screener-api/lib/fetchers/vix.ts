/**
 * Fetch latest VIX close from Yahoo Finance.
 * Falls back to a reasonable default on failure.
 */
export async function fetchVix(): Promise<{ date: string; close: number }> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance VIX fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error("No VIX data in Yahoo Finance response");
  }

  const timestamps = result.timestamp;
  const closes = result.indicators?.quote?.[0]?.close;

  if (!timestamps?.length || !closes?.length) {
    throw new Error("Empty VIX data from Yahoo Finance");
  }

  // Get the last available data point
  const lastIdx = timestamps.length - 1;
  const ts = timestamps[lastIdx];
  const close = closes[lastIdx];

  const date = new Date(ts * 1000).toISOString().slice(0, 10);

  return { date, close: Number(Number(close).toFixed(2)) };
}
