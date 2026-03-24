export const MOCK_TICKERS = [
  { ticker: "AAPL", asset: "stock", sector: "Technology" },
  { ticker: "MSFT", asset: "stock", sector: "Technology" },
  { ticker: "QCOM", asset: "stock", sector: "Semiconductors" },
  { ticker: "UNH", asset: "stock", sector: "Healthcare" },
  { ticker: "NVDA", asset: "stock", sector: "Semiconductors" },
] as const;

export type MockTicker = (typeof MOCK_TICKERS)[number];
