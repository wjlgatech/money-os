import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { interpretFundamentals } from "@/lib/ai/claude";
import { readFile } from "fs/promises";
import path from "path";

/**
 * GET /api/fundamentals/insight?ticker=NVDA
 *
 * Returns raw FMP fundamentals + Claude's personalized interpretation
 * contextualized to the user's specific position in that stock.
 *
 * Raw data on the left. AI coaching on the right.
 * That's Option B.
 */
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) return apiError("ticker parameter required", 400);
  if (!/^[A-Z0-9.]{1,10}$/.test(ticker)) return apiError("Invalid ticker", 400);

  if (!config.fmpApiKey) {
    return apiError("FMP_API_KEY not configured", 503);
  }

  try {
    // ── 1. Fetch fundamentals from FMP ─────────────────────────
    const [profileRes, ratiosRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${config.fmpApiKey}`, {
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`https://financialmodelingprep.com/stable/ratios-ttm?symbol=${ticker}&apikey=${config.fmpApiKey}`, {
        signal: AbortSignal.timeout(10_000),
      }),
    ]);

    const profileData = await profileRes.json().catch(() => []);
    const ratiosData = await ratiosRes.json().catch(() => []);
    // FMP returns [] for unknown tickers, or {"Error Message": "..."} for invalid ones
    const profile = Array.isArray(profileData) ? profileData[0] : null;
    const ratios = Array.isArray(ratiosData) ? ratiosData[0] : null;

    if (!profile || !profile.companyName) {
      return apiError(
        `No data for ${ticker}. FMP covers US stocks/ETFs. Crypto (BTC, ETH) and some international tickers are not supported on the free tier.`,
        404
      );
    }

    // ── 2. Get user's position in this ticker ──────────────────
    let position = { qty: 0, avgCost: 0, currentPrice: profile.price ?? 0 };
    try {
      const holdingsPath = path.join(process.cwd(), "..", "..", "profile", "holdings.md");
      const content = await readFile(holdingsPath, "utf8");
      const lines = content.split("\n");
      for (const line of lines) {
        const m = line.match(/^\|\s*([A-Z0-9.]+)\s*\|\s*([\d.]+)\s*\|\s*\$?([\d.,]+|—)\s*\|/);
        if (m && m[1] === ticker) {
          position.qty = Number(m[2]);
          const avgStr = m[3].replace(/,/g, "");
          position.avgCost = avgStr === "—" ? 0 : Number(avgStr);
          // Try to get current price from line
          const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
          if (cols[3]) position.currentPrice = Number(cols[3].replace(/[$,]/g, "")) || profile.price;
          break;
        }
      }
    } catch { /* no holdings file, that's fine */ }

    // ── 3. Build raw fundamentals object ──────────────────────
    const netMargin = ratios?.netProfitMarginTTM != null
      ? Number((ratios.netProfitMarginTTM * 100).toFixed(1)) : null;
    const grossMargin = ratios?.grossProfitMarginTTM != null
      ? Number((ratios.grossProfitMarginTTM * 100).toFixed(1)) : null;
    const roe = ratios?.returnOnEquityTTM != null
      ? Number((ratios.returnOnEquityTTM * 100).toFixed(1)) : null;
    const debtToEquity = ratios?.debtEquityRatioTTM ?? null;
    const pe = profile.pe ?? ratios?.peRatioTTM ?? null;
    const ps = ratios?.priceToSalesRatioTTM ?? null;
    const pb = ratios?.priceToBookRatioTTM ?? null;
    const dividendYield = ratios?.dividendYieldTTM != null
      ? Number((ratios.dividendYieldTTM * 100).toFixed(2)) : null;

    const marketCap = profile.marketCap;
    const marketCapFormatted = formatMarketCap(marketCap);

    // Unrealized P&L
    const unrealizedPnlPct = position.avgCost > 0
      ? ((position.currentPrice - position.avgCost) / position.avgCost) * 100
      : 0;
    const positionValue = position.qty * position.currentPrice;

    // Portfolio weight — rough estimate from holdings.md total
    const portfolioPct = positionValue > 0 ? (positionValue / 222676) * 100 : 0; // approx total from holdings

    const raw = {
      ticker,
      companyName: profile.companyName,
      sector: profile.sector,
      industry: profile.industry,
      price: profile.price,
      marketCap,
      marketCapFormatted,
      beta: profile.beta,
      range52w: profile.range,
      pe,
      ps,
      pb,
      netMargin,
      grossMargin,
      roe,
      debtToEquity,
      dividendYield,
      description: profile.description?.slice(0, 300) ?? null,
    };

    // ── 4. Claude interpretation ──────────────────────────────
    let aiInsight: string | null = null;
    try {
      aiInsight = await interpretFundamentals({
        ticker,
        companyName: profile.companyName,
        sector: profile.sector ?? "Unknown",
        marketCapFormatted,
        netMargin,
        grossMargin,
        roe,
        debtToEquity,
        pe,
        ps,
        qty: position.qty,
        avgCost: position.avgCost,
        currentPrice: position.currentPrice,
        unrealizedPnlPct,
        positionValue,
        portfolioPct,
      });
    } catch (err) {
      console.error("Claude interpretation failed:", (err as Error).message);
    }

    return apiSuccess({
      raw,
      position: {
        qty: position.qty,
        avgCost: position.avgCost,
        currentPrice: position.currentPrice,
        unrealizedPnlPct: Number(unrealizedPnlPct.toFixed(1)),
        positionValue: Number(positionValue.toFixed(0)),
        portfolioPct: Number(portfolioPct.toFixed(1)),
      },
      aiInsight,
    });
  } catch (err) {
    return apiError("Fundamentals insight fetch failed", 500);
  }
}

function formatMarketCap(cap: number | null): string {
  if (!cap) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap}`;
}
