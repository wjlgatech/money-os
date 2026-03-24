import { config } from "../config";

export interface AlpacaBar {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AlpacaApiBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface AlpacaBarsResponse {
  bars: AlpacaApiBar[];
  next_page_token: string | null;
}

// Rate limiting: track requests per minute
let requestCount = 0;
let windowStart = Date.now();
const MAX_REQUESTS_PER_MINUTE = 190; // leave buffer under Alpaca's 200

async function throttle() {
  const elapsed = Date.now() - windowStart;
  if (elapsed > 60_000) {
    requestCount = 0;
    windowStart = Date.now();
  }
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    const waitMs = 60_000 - elapsed + 100;
    await new Promise((r) => setTimeout(r, waitMs));
    requestCount = 0;
    windowStart = Date.now();
  }
  requestCount++;
}

/**
 * Fetch OHLCV bars from Alpaca Markets API.
 * Handles pagination automatically.
 */
export async function fetchBars(
  ticker: string,
  timeframe: "1Day" | "1Week",
  start: string, // ISO date
  end: string // ISO date
): Promise<AlpacaBar[]> {
  if (!config.hasAlpacaKeys) {
    throw new Error("Alpaca API keys not configured");
  }

  const allBars: AlpacaBar[] = [];
  let pageToken: string | null = null;

  do {
    await throttle();

    const params = new URLSearchParams({
      start,
      end,
      timeframe,
      limit: "10000",
      adjustment: "split",
    });
    if (pageToken) params.set("page_token", pageToken);

    const url = `${config.alpacaBaseUrl}/v2/stocks/${ticker}/bars?${params}`;
    const response = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": config.alpacaApiKey,
        "APCA-API-SECRET-KEY": config.alpacaApiSecret,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Alpaca API error ${response.status} for ${ticker}: ${body}`
      );
    }

    const data: AlpacaBarsResponse = await response.json();
    for (const bar of data.bars ?? []) {
      allBars.push({
        ts: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      });
    }

    pageToken = data.next_page_token;
  } while (pageToken);

  return allBars;
}
