/**
 * Financial Modeling Prep (FMP) Fetcher
 *
 * Free tier: 250 requests/day. Provides fundamentals, earnings calendar.
 * API key required — get one at https://financialmodelingprep.com/developer
 *
 * Falls back gracefully when no API key is configured.
 */

import { config } from "../config";

export interface Fundamentals {
  ticker: string;
  asOfDate: string;
  marketCap: number | null;
  peRatio: number | null;
  psRatio: number | null;
  revenueGrowth: number | null;  // YoY %
  earningsGrowth: number | null; // YoY %
  grossMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  freeCashFlow: number | null;
  dividendYield: number | null;
  sector: string | null;
  industry: string | null;
}

export interface EarningsEvent {
  ticker: string;
  reportDate: string;
  timeOfDay: string | null; // 'bmo' (before market open) | 'amc' (after market close)
  estimatedEps: number | null;
}

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

/**
 * Fetch fundamentals for a single ticker.
 * Returns null if FMP key not configured.
 */
export async function fetchFundamentals(ticker: string): Promise<Fundamentals | null> {
  if (!config.fmpApiKey) return null;

  try {
    // Key ratios (TTM)
    const ratioUrl = `${FMP_BASE}/ratios-ttm/${ticker}?apikey=${config.fmpApiKey}`;
    const profileUrl = `${FMP_BASE}/profile/${ticker}?apikey=${config.fmpApiKey}`;

    const [ratioRes, profileRes] = await Promise.all([
      fetch(ratioUrl),
      fetch(profileUrl),
    ]);

    if (!ratioRes.ok || !profileRes.ok) return null;

    const ratios = (await ratioRes.json())[0];
    const profile = (await profileRes.json())[0];

    if (!profile) return null;

    return {
      ticker,
      asOfDate: new Date().toISOString().slice(0, 10),
      marketCap: profile.mktCap ?? null,
      peRatio: ratios?.peRatioTTM ?? profile.peRatio ?? null,
      psRatio: ratios?.priceToSalesRatioTTM ?? null,
      revenueGrowth: ratios?.revenueGrowthTTM ?? null,
      earningsGrowth: ratios?.netIncomeGrowthTTM ?? null,
      grossMargin: ratios?.grossProfitMarginTTM ?? null,
      netMargin: ratios?.netProfitMarginTTM ?? null,
      debtToEquity: ratios?.debtEquityRatioTTM ?? null,
      freeCashFlow: profile.freeCashFlow ?? null,
      dividendYield: ratios?.dividendYieldTTM ?? null,
      sector: profile.sector ?? null,
      industry: profile.industry ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch earnings calendar for next N days.
 * Returns empty array if FMP key not configured.
 */
export async function fetchEarningsCalendar(days: number = 14): Promise<EarningsEvent[]> {
  if (!config.fmpApiKey) return [];

  try {
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const url = `${FMP_BASE}/earning_calendar?from=${from}&to=${to}&apikey=${config.fmpApiKey}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((e: Record<string, unknown>) => ({
      ticker: e.symbol as string,
      reportDate: e.date as string,
      timeOfDay: e.time === "bmo" ? "bmo" : e.time === "amc" ? "amc" : null,
      estimatedEps: (e.epsEstimated as number) ?? null,
    }));
  } catch {
    return [];
  }
}
