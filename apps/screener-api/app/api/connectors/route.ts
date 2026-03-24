import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { ConnectorManager } from "@/lib/connectors/manager";

// Singleton manager
let manager: ConnectorManager | null = null;
async function getManager(): Promise<ConnectorManager> {
  if (!manager) {
    manager = new ConnectorManager();
    await manager.loadAndReconnect();
  }
  return manager;
}

// GET — list connectors + unified portfolio
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view"); // "connectors" | "portfolio" | "summary"

  const mgr = await getManager();

  if (view === "connectors" || !view) {
    return apiSuccess({ connectors: mgr.listAvailable() });
  }

  if (view === "portfolio" || view === "summary") {
    const summary = await mgr.getPortfolioSummary();
    return apiSuccess(summary);
  }

  return apiError("Unknown view. Use: connectors, portfolio, summary", 400);
}

// POST — connect, disconnect, sync
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action, connectorId, credentials } = body;
    const mgr = await getManager();

    if (action === "connect") {
      if (!connectorId) return apiError("connectorId is required", 400);
      const status = await mgr.connectBroker(connectorId, credentials ?? {});
      return apiSuccess(status);
    }

    if (action === "disconnect") {
      if (!connectorId) return apiError("connectorId is required", 400);
      await mgr.disconnectBroker(connectorId);
      return apiSuccess({ message: `${connectorId} disconnected` });
    }

    if (action === "sync") {
      const results = await mgr.syncAll();
      return apiSuccess({ results });
    }

    if (action === "sync_one") {
      if (!connectorId) return apiError("connectorId is required", 400);
      const results = await mgr.syncAll(); // TODO: sync single
      return apiSuccess({ result: results[connectorId] ?? { error: "Not connected" } });
    }

    return apiError("Unknown action. Use: connect, disconnect, sync", 400);
  } catch (err) {
    return apiError("Connector operation failed", 500);
  }
}
