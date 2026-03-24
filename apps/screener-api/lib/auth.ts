import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { config } from "./config";
import { apiError } from "./errors";

/**
 * Timing-safe string comparison.
 * Prevents timing attacks that leak token contents.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates bearer token on incoming request.
 *
 * SECURITY: If broker keys are configured (real money at stake),
 * auth is ALWAYS enforced regardless of NODE_ENV.
 * Dev-mode bypass only works for read-only data endpoints
 * when no broker keys and no token are configured.
 */
export function validateRequest(req: NextRequest) {
  // If real broker keys are present, ALWAYS require auth — no exceptions
  if (config.hasAlpacaTrading && config.screenerApiToken) {
    return enforceAuth(req, config.screenerApiToken);
  }

  // Dev mode without broker keys: allow unauthenticated access to data endpoints
  if (!config.isProduction && !config.screenerApiToken && !config.hasAlpacaTrading) {
    return null;
  }

  // All other cases: enforce auth
  if (!config.screenerApiToken) {
    return apiError("SCREENER_API_TOKEN not configured. Set it in .env.local", 500);
  }

  return enforceAuth(req, config.screenerApiToken);
}

/**
 * Validates Vercel Cron secret.
 */
export function validateCron(req: NextRequest) {
  if (!config.isProduction && !config.cronSecret) {
    return null;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !safeCompare(authHeader, `Bearer ${config.cronSecret}`)) {
    return apiError("Unauthorized cron request", 401);
  }

  return null;
}

function enforceAuth(req: NextRequest, expectedToken: string) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return apiError("Missing or invalid Authorization header", 401);
  }

  const token = authHeader.slice(7);
  if (!safeCompare(token, expectedToken)) {
    return apiError("Invalid token", 401);
  }

  return null;
}
