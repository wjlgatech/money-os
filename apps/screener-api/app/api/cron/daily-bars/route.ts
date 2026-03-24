import { NextRequest } from "next/server";
import { validateCron } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { fetchDailyBars } from "@/jobs/fetchDailyBars";

export async function GET(req: NextRequest) {
  const authErr = validateCron(req);
  if (authErr) return authErr;

  try {
    const result = await fetchDailyBars();
    return apiSuccess(result);
  } catch (err) {
    return apiError((err as Error).message);
  }
}
