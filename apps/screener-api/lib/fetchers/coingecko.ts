/**
 * CoinGecko Fetcher — Free, no API key needed.
 * Rate limit: 10-30 req/min on free tier.
 */

export interface CryptoBar {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Map common crypto tickers to CoinGecko IDs
const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  SEI: "sei-network",
};

export function getCoinId(ticker: string): string | null {
  return COIN_IDS[ticker.toUpperCase()] ?? null;
}

export function getSupportedCryptoTickers(): string[] {
  return Object.keys(COIN_IDS);
}

/**
 * Fetch OHLC bars from CoinGecko.
 * Free tier: no API key, 10-30 req/min.
 *
 * @param coinId - CoinGecko coin ID (e.g., "bitcoin")
 * @param days - Number of days: 1, 7, 14, 30, 90, 180, 365
 */
export async function fetchCryptoBars(
  coinId: string,
  days: number = 180
): Promise<CryptoBar[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko error ${response.status} for ${coinId}`);
  }

  // CoinGecko OHLC returns: [[timestamp_ms, open, high, low, close], ...]
  const data: number[][] = await response.json();

  return data.map(([ts, open, high, low, close]) => ({
    ts: new Date(ts).toISOString(),
    open,
    high,
    low,
    close,
    volume: 0, // CoinGecko OHLC doesn't include volume
  }));
}

/**
 * Fetch current prices for multiple coins at once.
 */
export async function fetchCryptoPrices(
  coinIds: string[]
): Promise<Record<string, number>> {
  const ids = coinIds.join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko price fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const prices: Record<string, number> = {};
  for (const [id, val] of Object.entries(data)) {
    prices[id] = (val as { usd: number }).usd;
  }
  return prices;
}
