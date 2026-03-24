import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { db } from "@/lib/db";
import { pipelineStatus } from "@/lib/db/schema";
import { config } from "@/lib/config";

const MOCK_PIPELINE = [
  { jobName: "daily_bars", status: "idle", total: 500, completed: 500, latestDate: new Date().toISOString().slice(0, 10), lastRunAt: new Date().toISOString() },
  { jobName: "weekly_bars", status: "idle", total: 500, completed: 500, latestDate: new Date().toISOString().slice(0, 10), lastRunAt: new Date().toISOString() },
  { jobName: "vix", status: "idle", total: 1, completed: 1, latestDate: new Date().toISOString().slice(0, 10), lastRunAt: new Date().toISOString() },
  { jobName: "trendline_engine", status: "idle", total: 500, completed: 500, latestDate: new Date().toISOString().slice(0, 10), lastRunAt: new Date().toISOString() },
  { jobName: "signal_generator", status: "idle", total: 500, completed: 500, latestDate: new Date().toISOString().slice(0, 10), lastRunAt: new Date().toISOString() },
  { jobName: "scanner_engine", status: "idle", total: 500, completed: 500, latestDate: new Date().toISOString().slice(0, 10), lastRunAt: new Date().toISOString() },
];

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  if (!config.hasDatabaseUrl || !db) {
    return apiSuccess({ jobs: MOCK_PIPELINE });
  }

  try {
    const jobs = await db.select().from(pipelineStatus);
    return apiSuccess({ jobs });
  } catch (err) {
    return apiError((err as Error).message);
  }
}
