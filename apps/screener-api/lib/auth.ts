import { NextRequest } from "next/server";
import { config } from "./config";
import { apiError } from "./errors";

/**
 * Validates bearer token on incoming request.
 * In dev mode without a configured token, all requests pass.
 * Returns null if valid, or an error NextResponse if invalid.
 */
export function validateRequest(req: NextRequest) {
  // Skip auth in dev when no token configured
  if (!config.isProduction && !config.screenerApiToken) {
    return null;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return apiError("Missing or invalid Authorization header", 401);
  }

  const token = authHeader.slice(7);
  if (token !== config.screenerApiToken) {
    return apiError("Invalid token", 401);
  }

  return null;
}

/**
 * Validates Vercel Cron secret.
 * Returns null if valid, or an error NextResponse if invalid.
 */
export function validateCron(req: NextRequest) {
  if (!config.isProduction && !config.cronSecret) {
    return null;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${config.cronSecret}`) {
    return apiError("Unauthorized cron request", 401);
  }

  return null;
}
