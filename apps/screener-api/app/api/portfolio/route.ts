import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { TradeExecutor } from "@/lib/broker/executor";
import { readFile } from "fs/promises";
import path from "path";

/**
 * GET /api/portfolio — Unified portfolio from ALL sources
 *
 * Merges:
 * 1. Connected broker (Alpaca paper or live)
 * 2. Imported holdings from profile/holdings.md (screenshot, manual, CSV)
 * 3. Paper trading positions
 *
 * Returns ONE view of everything the user owns.
 */

interface UnifiedPosition {
  symbol: string;
  name: string;
  source: string;       // "alpaca" | "fidelity" | "coinbase" | "manual" | "paper"
  account: string;      // "Fidelity Brokerage" | "Coinbase" | "Alpaca Paper"
  qty: number;
  avgCost: number | null;
  currentPrice: number | null;
  value: number;
  pnl: number | null;
  pnlPct: number | null;
  assetType: string;    // "stock" | "etf" | "crypto"
  sector: string | null;
}

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const allPositions: UnifiedPosition[] = [];

    // ── Source 1: Connected broker (Alpaca) ───────────────
    try {
      const executor = new TradeExecutor();
      const brokerPortfolio = await executor.getPortfolio();
      for (const p of brokerPortfolio.positions) {
        allPositions.push({
          symbol: p.symbol,
          name: p.symbol,
          source: brokerPortfolio.backend,
          account: brokerPortfolio.backend === "alpaca" ? "Alpaca Paper" : "Broker",
          qty: p.qty,
          avgCost: p.avgEntry,
          currentPrice: p.currentPrice,
          value: p.currentPrice * p.qty,
          pnl: p.unrealizedPnl,
          pnlPct: p.avgEntry > 0 ? ((p.currentPrice - p.avgEntry) / p.avgEntry) * 100 : null,
          assetType: "stock",
          sector: null,
        });
      }
    } catch { /* broker not connected, continue */ }

    // ── Source 2: Imported holdings from profile/holdings.md ──
    try {
      const holdingsPath = path.join(process.cwd(), "..", "..", "profile", "holdings.md");
      const holdingsContent = await readFile(holdingsPath, "utf8");
      const imported = parseHoldingsMarkdown(holdingsContent);
      allPositions.push(...imported);
    } catch { /* no profile/holdings.md, continue */ }

    // ── Compute totals ───────────────────────────────────
    const totalValue = allPositions.reduce((s, p) => s + p.value, 0);

    // Group by source
    const bySource: Record<string, { positions: UnifiedPosition[]; value: number }> = {};
    for (const p of allPositions) {
      const key = `${p.source}:${p.account}`;
      if (!bySource[key]) bySource[key] = { positions: [], value: 0 };
      bySource[key].positions.push(p);
      bySource[key].value += p.value;
    }

    // Asset allocation
    const byType: Record<string, number> = {};
    for (const p of allPositions) {
      byType[p.assetType] = (byType[p.assetType] ?? 0) + p.value;
    }

    // Sector exposure
    const bySector: Record<string, number> = {};
    for (const p of allPositions) {
      const sector = p.sector ?? "Unknown";
      bySector[sector] = (bySector[sector] ?? 0) + p.value;
    }

    return apiSuccess({
      totalValue,
      positionCount: allPositions.length,
      positions: allPositions,
      accounts: Object.entries(bySource).map(([key, data]) => ({
        name: key.split(":")[1],
        source: key.split(":")[0],
        value: Number(data.value.toFixed(2)),
        positionCount: data.positions.length,
      })),
      allocation: Object.fromEntries(
        Object.entries(byType).map(([type, val]) => [type, Number(((val / (totalValue || 1)) * 100).toFixed(1))])
      ),
      sectorExposure: Object.fromEntries(
        Object.entries(bySector).map(([sector, val]) => [sector, Number(((val / (totalValue || 1)) * 100).toFixed(1))])
      ),
    });
  } catch (err) {
    return apiError("Portfolio fetch failed", 500);
  }
}

/**
 * POST /api/portfolio — Add positions manually
 * (Quick add: "I own 10 TSLA" → immediately reflected)
 */
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action, positions } = body;

    if (action === "add") {
      // Append to profile/holdings.md
      const holdingsPath = path.join(process.cwd(), "..", "..", "profile", "holdings.md");
      const { mkdir, appendFile } = await import("fs/promises");
      const { existsSync } = await import("fs");

      const dir = path.dirname(holdingsPath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });

      let content = "";
      try { content = await readFile(holdingsPath, "utf8"); } catch {}

      if (!content.includes("# Holdings")) {
        content = `# Holdings\n\nLast updated: ${new Date().toISOString().slice(0, 10)}\n\n## Manual Entry\n| Ticker | Shares | Avg Cost | Type |\n|--------|--------|----------|------|\n`;
      }

      for (const pos of positions ?? []) {
        content += `| ${pos.ticker} | ${pos.qty} | ${pos.avgCost ?? "—"} | ${pos.type ?? "stock"} |\n`;
      }

      const { writeFile } = await import("fs/promises");
      await writeFile(holdingsPath, content);

      return apiSuccess({ message: `Added ${positions?.length ?? 0} positions`, path: holdingsPath });
    }

    return apiError("Unknown action. Use: add", 400);
  } catch (err) {
    return apiError("Failed to update portfolio", 500);
  }
}

// ── Parse holdings.md ────────────────────────────────────────

function parseHoldingsMarkdown(content: string): UnifiedPosition[] {
  const positions: UnifiedPosition[] = [];
  const lines = content.split("\n");

  let currentAccount = "Imported";
  let currentSource = "manual";

  for (const line of lines) {
    // Detect account headers: ## Fidelity (Brokerage)
    const headerMatch = line.match(/^## (.+?)(?:\s*\((.+)\))?$/);
    if (headerMatch) {
      currentAccount = headerMatch[1].trim();
      const accountType = headerMatch[2]?.trim() ?? "";
      // Infer source from account name
      if (currentAccount.toLowerCase().includes("fidelity")) currentSource = "fidelity";
      else if (currentAccount.toLowerCase().includes("coinbase")) currentSource = "coinbase";
      else if (currentAccount.toLowerCase().includes("kraken")) currentSource = "kraken";
      else if (currentAccount.toLowerCase().includes("moomoo")) currentSource = "moomoo";
      else currentSource = "manual";
      continue;
    }

    // Parse table rows: | AAPL | 50 | $142.30 | $251.49 | $12,574 | Technology |
    const tableMatch = line.match(/^\|\s*([A-Z0-9.]+)\s*\|\s*([\d.]+)\s*\|\s*\$?([\d.,]+|—)\s*\|/);
    if (tableMatch) {
      const ticker = tableMatch[1];
      const qty = Number(tableMatch[2]);
      const avgCostStr = tableMatch[3].replace(/,/g, "");
      const avgCost = avgCostStr === "—" ? null : Number(avgCostStr);

      if (qty <= 0) continue;

      // Try to extract more columns
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      const currentPrice = cols[3] ? Number(cols[3].replace(/[$,]/g, "")) || null : null;
      const value = cols[4] ? Number(cols[4].replace(/[$,]/g, "")) || (currentPrice ? currentPrice * qty : (avgCost ?? 0) * qty) : (avgCost ?? 0) * qty;
      const sector = cols[5] || null;

      // Determine asset type
      let assetType: string = "stock";
      const typeCol = cols[cols.length - 1]?.toLowerCase() ?? "";
      if (typeCol.includes("crypto") || ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"].includes(ticker)) assetType = "crypto";
      else if (typeCol.includes("etf") || ["VTI", "QQQ", "SPY", "IWM", "VOO"].includes(ticker)) assetType = "etf";

      positions.push({
        symbol: ticker,
        name: ticker,
        source: currentSource,
        account: currentAccount,
        qty,
        avgCost,
        currentPrice,
        value,
        pnl: avgCost && currentPrice ? (currentPrice - avgCost) * qty : null,
        pnlPct: avgCost && currentPrice ? ((currentPrice - avgCost) / avgCost) * 100 : null,
        assetType,
        sector,
      });
    }
  }

  return positions;
}
