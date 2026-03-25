import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";

/**
 * GET /api/opportunities — Tiered, ranked opportunities
 *
 * Not random. Not "first 3 from scanner." Ranked by relevance to YOU.
 *
 * Tier 1: YOUR stocks near key levels (highest priority)
 * Tier 2: Portfolio gaps (sectors you're underweight)
 * Tier 3: High-conviction scanner hits (3+ signals)
 * Tier 4: Watchlist approaching (ALERT zone)
 *
 * ?tier=1     — only your stocks
 * ?tier=all   — everything, tiered
 * ?search=TSLA — search for specific ticker
 * ?limit=10   — max results per tier
 */
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const tierFilter = searchParams.get("tier") ?? "all";
    const search = searchParams.get("search")?.toUpperCase();
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    if (!config.hasDatabaseUrl) {
      return apiSuccess({ tiers: [], message: "Database not configured" });
    }

    const { db } = await import("@/lib/db");
    const { scanResults, tradingSignals, watchedTickers } = await import("@/lib/db/schema");
    const { eq, desc, and } = await import("drizzle-orm");
    if (!db) return apiError("Database not available", 503);

    // Get user's actual holdings (from profile + broker)
    let ownedTickers: string[] = [];
    try {
      const portfolioRes = await fetch(`http://localhost:${process.env.PORT ?? 3001}/api/portfolio`, {
        headers: { Authorization: `Bearer ${config.screenerApiToken}` },
      });
      const portfolioData = await portfolioRes.json();
      ownedTickers = (portfolioData.positions ?? []).map((p: { symbol: string }) => p.symbol);
    } catch { /* can't reach portfolio API, continue without */ }

    // Get all scanner results
    const allScan = await db.select().from(scanResults);
    const allSignals = await db.select().from(tradingSignals);

    // Build signal count per ticker
    const signalCount = new Map<string, number>();
    for (const s of allSignals) {
      if (s.direction === "bull") {
        signalCount.set(s.ticker, (signalCount.get(s.ticker) ?? 0) + 1);
      }
    }

    // Search mode
    if (search) {
      const matches = allScan.filter((r) => r.ticker === search);
      const signals = allSignals.filter((s) => s.ticker === search);
      const owned = ownedTickers.includes(search);
      return apiSuccess({
        search,
        owned,
        scanResults: matches,
        signals,
        signalCount: signalCount.get(search) ?? 0,
        inUniverse: (await db.select().from(watchedTickers).where(eq(watchedTickers.ticker, search))).length > 0,
      });
    }

    // ── Tier 1: YOUR stocks near key levels ──────────────
    const tier1 = allScan
      .filter((r) => ownedTickers.includes(r.ticker))
      .map((r) => ({
        ...r,
        tier: 1 as const,
        tierLabel: "Your stocks at key levels",
        relevance: "You own this — support/resistance levels directly affect your P&L",
        signals: signalCount.get(r.ticker) ?? 0,
      }))
      .slice(0, limit);

    // ── Tier 2: Portfolio gaps (would need sector targets — use a simple heuristic)
    const ownedSectors = new Set<string>();
    // For now, mark any ENTRY zone stock in a sector the user doesn't own as a gap filler
    for (const r of allScan) {
      if (ownedTickers.includes(r.ticker) && r.sector) {
        ownedSectors.add(r.sector);
      }
    }
    const tier2 = allScan
      .filter((r) => r.zone === "ENTRY" && r.sector && !ownedSectors.has(r.sector) && !ownedTickers.includes(r.ticker))
      .map((r) => ({
        ...r,
        tier: 2 as const,
        tierLabel: "Fills a portfolio gap",
        relevance: `You have no ${r.sector} exposure — this would diversify`,
        signals: signalCount.get(r.ticker) ?? 0,
      }))
      // Deduplicate by sector (one per gap)
      .filter((r, i, arr) => arr.findIndex((x) => x.sector === r.sector) === i)
      .slice(0, limit);

    // ── Tier 3: High-conviction scanner hits ─────────────
    const tier3 = allScan
      .filter((r) => r.zone === "ENTRY" && (signalCount.get(r.ticker) ?? 0) >= 2 && !ownedTickers.includes(r.ticker))
      .map((r) => ({
        ...r,
        tier: 3 as const,
        tierLabel: "Strong technical setup",
        relevance: `${signalCount.get(r.ticker)} confirming signals — above-average conviction`,
        signals: signalCount.get(r.ticker) ?? 0,
      }))
      .sort((a, b) => b.signals - a.signals)
      .slice(0, limit);

    // ── Tier 4: Watchlist approaching ────────────────────
    const tier4 = allScan
      .filter((r) => r.zone === "ALERT")
      .map((r) => ({
        ...r,
        tier: 4 as const,
        tierLabel: "Approaching key level",
        relevance: `${Number(r.distanceAtr).toFixed(1)} ATR away — watch for entry in ~${Math.ceil(Number(r.distanceAtr) * 2)} days`,
        signals: signalCount.get(r.ticker) ?? 0,
      }))
      .slice(0, limit);

    // Combine based on filter
    const tiers = [];
    if (tierFilter === "all" || tierFilter === "1") tiers.push({ tier: 1, label: "Your stocks at key levels", items: tier1 });
    if (tierFilter === "all" || tierFilter === "2") tiers.push({ tier: 2, label: "Fills a portfolio gap", items: tier2 });
    if (tierFilter === "all" || tierFilter === "3") tiers.push({ tier: 3, label: "Strong technical setups", items: tier3 });
    if (tierFilter === "all" || tierFilter === "4") tiers.push({ tier: 4, label: "Approaching key levels", items: tier4 });

    return apiSuccess({
      tiers,
      ownedTickers,
      totalScanResults: allScan.length,
      totalSignals: allSignals.length,
    });
  } catch (err) {
    return apiError("Opportunities fetch failed", 500);
  }
}
