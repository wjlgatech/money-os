import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockScannerResults } from "@/lib/mock/bars";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // 'entry' | 'alert' | 'entry,alert'
  const sector = searchParams.get("sector");
  const asset = searchParams.get("asset");

  if (!config.hasDatabaseUrl) {
    let results = getMockScannerResults();

    // Apply filters
    if (filter) {
      const zones = filter.split(",").map((f) => f.toUpperCase());
      results = results.filter((r) => zones.includes(r.zone));
    }
    if (sector) {
      results = results.filter((r) => r.sector?.toLowerCase() === sector.toLowerCase());
    }
    if (asset) {
      results = results.filter((r) => r.asset === asset);
    }

    return apiSuccess({
      results,
      total: results.length,
      scannedAt: new Date().toISOString(),
    });
  }

  const { db } = await import("@/lib/db");
  const { scanResults } = await import("@/lib/db/schema");
  const { eq, and, inArray, desc } = await import("drizzle-orm");

  if (!db) return apiError("Database not available", 503);

  // Build query conditions
  const conditions = [];
  if (filter) {
    const zones = filter.split(",").map((f) => f.toUpperCase());
    conditions.push(inArray(scanResults.zone, zones));
  }
  if (sector) {
    conditions.push(eq(scanResults.sector, sector));
  }
  if (asset) {
    conditions.push(eq(scanResults.asset, asset));
  }

  const results = await db
    .select()
    .from(scanResults)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(scanResults.scannedAt));

  return apiSuccess({
    results,
    total: results.length,
    scannedAt: results[0]?.scannedAt ?? null,
  });
}
