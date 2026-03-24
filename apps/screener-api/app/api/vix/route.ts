import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { getMockLatestVix } from "@/lib/mock/vix";

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  if (!config.hasDatabaseUrl) {
    return apiSuccess(getMockLatestVix());
  }

  const { db } = await import("@/lib/db");
  const { vixData } = await import("@/lib/db/schema");
  const { desc } = await import("drizzle-orm");

  if (!db) return apiError("Database not available", 503);

  const results = await db
    .select()
    .from(vixData)
    .orderBy(desc(vixData.date))
    .limit(1);

  if (results.length === 0) {
    return apiSuccess({ date: null, close: null });
  }

  return apiSuccess(results[0]);
}
