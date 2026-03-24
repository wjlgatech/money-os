import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { TradeExecutor } from "@/lib/broker/executor";

// GET — portfolio snapshot (auto-detects paper vs alpaca from server config)
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    // Backend determined by server config only — never by client
    const executor = new TradeExecutor();
    const portfolio = await executor.getPortfolio();
    return apiSuccess(portfolio);
  } catch (err) {
    return apiError("Failed to fetch portfolio", 500);
  }
}

// POST — execute a trade
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action, ticker, shares, price, stopLoss, takeProfit, reason, signals } = body;
    // SECURITY: backend is ALWAYS determined by server config, never by client input
    const executor = new TradeExecutor();

    // Input validation
    if (action === "buy" || action === "sell") {
      if (!ticker || typeof ticker !== "string") return apiError("ticker is required", 400);
      if (!Number.isFinite(shares) || shares <= 0) return apiError("shares must be a positive number", 400);
      if (!Number.isFinite(price) || price <= 0) return apiError("price must be a positive number", 400);
    }

    if (action === "buy") {
      if (stopLoss != null && (!Number.isFinite(stopLoss) || stopLoss <= 0)) {
        return apiError("stopLoss must be a positive number", 400);
      }
      if (takeProfit != null && (!Number.isFinite(takeProfit) || takeProfit <= 0)) {
        return apiError("takeProfit must be a positive number", 400);
      }
      const result = await executor.executeBuy(
        ticker, shares, price, stopLoss ?? null, takeProfit ?? null,
        reason ?? "Manual buy", signals ?? []
      );
      return apiSuccess(result);
    }

    if (action === "sell") {
      const result = await executor.executeSell(
        ticker, shares, price, reason ?? "Manual sell"
      );
      return apiSuccess(result);
    }

    if (action === "snapshot") {
      const portfolio = await executor.getPortfolio();
      return apiSuccess(portfolio);
    }

    return apiError("Unknown action. Use: buy, sell, snapshot", 400);
  } catch (err) {
    // Don't leak internal error details to clients
    const message = err instanceof Error ? err.message : "Trade execution failed";
    const isUserError = message.includes("Invalid") || message.includes("Insufficient");
    return apiError(isUserError ? message : "Trade execution failed", isUserError ? 400 : 500);
  }
}
