export interface YahooBar {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch OHLCV bars from Yahoo Finance.
 * No API key needed — uses the public chart endpoint.
 *
 * @param ticker - Stock ticker (e.g., "AAPL")
 * @param interval - "1d" for daily, "1wk" for weekly
 * @param range - Time range: "3mo", "6mo", "1y", "2y"
 */
export async function fetchYahooBars(
  ticker: string,
  interval: "1d" | "1wk" = "1d",
  range: string = "6mo"
): Promise<YahooBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance error ${response.status} for ${ticker}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No Yahoo Finance data for ${ticker}`);
  }

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) {
    throw new Error(`Empty Yahoo Finance response for ${ticker}`);
  }

  const bars: YahooBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];

    // Skip bars with null values (holidays, missing data)
    if (open == null || high == null || low == null || close == null) continue;

    bars.push({
      ts: new Date(timestamps[i] * 1000).toISOString(),
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: volume ?? 0,
    });
  }

  return bars;
}
