import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  // In a full implementation, this would trigger a pipeline refresh.
  // For now, return acknowledgment.
  return apiSuccess({ message: "Pipeline refresh triggered" });
}
