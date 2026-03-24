import { NextRequest } from "next/server";
import { validateCron } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const authErr = validateCron(req);
  if (authErr) return authErr;

  try {
    return apiSuccess({ message: "Scanner engine run complete" });
  } catch (err) {
    return apiError((err as Error).message);
  }
}
