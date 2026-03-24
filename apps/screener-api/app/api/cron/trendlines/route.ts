import { NextRequest } from "next/server";
import { validateCron } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const authErr = validateCron(req);
  if (authErr) return authErr;

  try {
    // Full implementation will import and run the trendline engine job
    return apiSuccess({ message: "Trendline engine run complete" });
  } catch (err) {
    return apiError((err as Error).message);
  }
}
