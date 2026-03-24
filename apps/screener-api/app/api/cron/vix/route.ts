import { NextRequest } from "next/server";
import { validateCron } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { fetchVixJob } from "@/jobs/fetchVix";

export async function GET(req: NextRequest) {
  const authErr = validateCron(req);
  if (authErr) return authErr;

  try {
    const result = await fetchVixJob();
    return apiSuccess(result);
  } catch (err) {
    return apiError((err as Error).message);
  }
}
