import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { PaperTrader } from "@/lib/engine/paperTrader";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const PORTFOLIO_PATH = path.join(process.cwd(), "data", "paper-portfolio.json");

async function loadTrader(): Promise<PaperTrader> {
  try {
    const json = await readFile(PORTFOLIO_PATH, "utf8");
    return PaperTrader.fromJSON(json);
  } catch {
    return new PaperTrader();
  }
}

async function saveTrader(trader: PaperTrader) {
  const dir = path.dirname(PORTFOLIO_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(PORTFOLIO_PATH, trader.toJSON());
}

// GET — portfolio snapshot
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const trader = await loadTrader();
  const portfolio = trader.getPortfolio();

  // Build current prices from positions
  const currentPrices: Record<string, number> = {};
  for (const pos of portfolio.positions) {
    currentPrices[pos.ticker] = pos.currentPrice;
  }

  const snapshot = trader.getSnapshot(currentPrices);
  return apiSuccess({
    snapshot,
    positions: portfolio.positions,
    recentTrades: portfolio.closedTrades.slice(-20),
    totalTrades: portfolio.closedTrades.length,
  });
}

// POST — execute a trade or action
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action } = body;
    const trader = await loadTrader();

    if (action === "buy") {
      const { ticker, shares, price, reason, stopLoss, takeProfit, signals } = body;
      const trade = trader.executeBuy(ticker, shares, price, reason, stopLoss, takeProfit, signals);
      await saveTrader(trader);
      return apiSuccess({ trade, message: `Bought ${shares} shares of ${ticker} at $${price}` });
    }

    if (action === "sell") {
      const { ticker, shares, price, reason } = body;
      const trade = trader.executeSell(ticker, shares, price, reason);
      await saveTrader(trader);
      return apiSuccess({ trade, message: `Sold ${shares} shares of ${ticker} at $${price}` });
    }

    if (action === "check_exits") {
      const { prices } = body; // Record<string, number>
      const trades = trader.checkExits(prices);
      await saveTrader(trader);
      return apiSuccess({ exitTrades: trades, count: trades.length });
    }

    if (action === "reset") {
      const newTrader = new PaperTrader();
      await saveTrader(newTrader);
      return apiSuccess({ message: "Portfolio reset to $100K" });
    }

    return apiError("Unknown action. Use: buy, sell, check_exits, reset", 400);
  } catch (err) {
    return apiError((err as Error).message, 400);
  }
}
