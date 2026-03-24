import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { TradeExecutor } from "@/lib/broker/executor";

// GET — portfolio snapshot (auto-detects paper vs alpaca)
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const executor = new TradeExecutor();
    const portfolio = await executor.getPortfolio();
    return apiSuccess(portfolio);
  } catch (err) {
    return apiError((err as Error).message);
  }
}

// POST — execute a trade
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action, ticker, shares, price, stopLoss, takeProfit, reason, signals, backend } = body;
    const executor = new TradeExecutor(backend);

    if (action === "buy") {
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
    return apiError((err as Error).message, 400);
  }
}
