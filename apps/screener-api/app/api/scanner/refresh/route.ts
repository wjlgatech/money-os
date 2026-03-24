import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  // In production, this would trigger a scanner engine run
  return apiSuccess({ message: "Scanner refresh triggered" });
}
