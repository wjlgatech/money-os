import { NextRequest } from "next/server";
import { validateCron } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { fetchWeeklyBars } from "@/jobs/fetchWeeklyBars";

export async function GET(req: NextRequest) {
  const authErr = validateCron(req);
  if (authErr) return authErr;

  try {
    const result = await fetchWeeklyBars();
    return apiSuccess(result);
  } catch (err) {
    return apiError((err as Error).message);
  }
}
