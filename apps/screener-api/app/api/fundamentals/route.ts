import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";

/**
 * GET /api/fundamentals?tickers=NVDA,TSLA,PLTR
 *
 * Fetches real fundamental data from FMP (Financial Modeling Prep).
 * Combines profile + ratios for a complete picture.
 */
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers") ?? searchParams.get("ticker") ?? "";

  if (!tickersParam) return apiError("tickers parameter required (comma-separated)", 400);

  const tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);

  if (!config.fmpApiKey) {
    return apiError("FMP_API_KEY not configured. Get a free key at https://site.financialmodelingprep.com/developer", 503);
  }

  try {
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          // Profile (price, marketCap, sector, industry)
          const profileRes = await fetch(
            `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${config.fmpApiKey}`,
            { signal: AbortSignal.timeout(10_000) }
          );
          const profileData = await profileRes.json();
          const profile = profileData[0];

          // Ratios TTM (margins, ROE, growth)
          const ratiosRes = await fetch(
            `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${ticker}&apikey=${config.fmpApiKey}`,
            { signal: AbortSignal.timeout(10_000) }
          );
          const ratiosData = await ratiosRes.json();
          const ratios = ratiosData[0];

          if (!profile) return { ticker, error: "No data available" };

          return {
            ticker,
            price: profile.price,
            companyName: profile.companyName,
            marketCap: profile.marketCap,
            marketCapFormatted: formatMarketCap(profile.marketCap),
            sector: profile.sector,
            industry: profile.industry,
            beta: profile.beta,
            range52w: profile.range,
            pe: profile.pe ?? ratios?.peRatioTTM ?? null,
            forwardPE: ratios?.forwardPeRatioTTM ?? null,
            ps: ratios?.priceToSalesRatioTTM ?? null,
            pb: ratios?.priceToBookRatioTTM ?? null,
            netMargin: ratios?.netProfitMarginTTM ? Number((ratios.netProfitMarginTTM * 100).toFixed(1)) : null,
            grossMargin: ratios?.grossProfitMarginTTM ? Number((ratios.grossProfitMarginTTM * 100).toFixed(1)) : null,
            roe: ratios?.returnOnEquityTTM ? Number((ratios.returnOnEquityTTM * 100).toFixed(1)) : null,
            debtToEquity: ratios?.debtEquityRatioTTM ?? null,
            dividendYield: ratios?.dividendYieldTTM ? Number((ratios.dividendYieldTTM * 100).toFixed(2)) : null,
            revenueGrowth: ratios?.revenueGrowthTTM ? Number((ratios.revenueGrowthTTM * 100).toFixed(1)) : null,
            // AI-friendly summary
            summary: generateSummary(ticker, profile, ratios),
          };
        } catch {
          return { ticker, error: "Fetch failed" };
        }
      })
    );

    return apiSuccess({ fundamentals: results });
  } catch (err) {
    return apiError("Fundamentals fetch failed", 500);
  }
}

function formatMarketCap(cap: number | null): string {
  if (!cap) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap}`;
}

function generateSummary(ticker: string, profile: any, ratios: any): string {
  const parts: string[] = [];

  parts.push(`${profile.companyName} (${profile.sector})`);

  const netMargin = ratios?.netProfitMarginTTM;
  if (netMargin != null) {
    const marginPct = (netMargin * 100).toFixed(1);
    if (netMargin > 0.2) parts.push(`highly profitable (${marginPct}% net margin)`);
    else if (netMargin > 0.05) parts.push(`profitable (${marginPct}% net margin)`);
    else if (netMargin > 0) parts.push(`thin margins (${marginPct}% net margin)`);
    else parts.push(`unprofitable (${marginPct}% net margin)`);
  }

  const pe = profile.pe ?? ratios?.peRatioTTM;
  if (pe != null) {
    if (pe > 100) parts.push(`expensive (P/E ${pe.toFixed(0)})`);
    else if (pe > 30) parts.push(`growth-priced (P/E ${pe.toFixed(0)})`);
    else if (pe > 15) parts.push(`fairly valued (P/E ${pe.toFixed(0)})`);
    else parts.push(`cheap (P/E ${pe.toFixed(0)})`);
  }

  const growth = ratios?.revenueGrowthTTM;
  if (growth != null) {
    const growthPct = (growth * 100).toFixed(0);
    if (growth > 0.3) parts.push(`fast-growing (revenue +${growthPct}%)`);
    else if (growth > 0.1) parts.push(`growing (revenue +${growthPct}%)`);
    else if (growth > 0) parts.push(`slow growth (revenue +${growthPct}%)`);
    else parts.push(`shrinking (revenue ${growthPct}%)`);
  }

  return parts.join(". ") + ".";
}
