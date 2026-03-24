import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { TradeGate } from "@/lib/engine/tradeGate";

// GET — view pending proposals and stats
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const gate = await TradeGate.load();
  return apiSuccess({
    pending: gate.getPending(),
    stats: gate.getStats(),
    rules: gate.getRules(),
  });
}

// POST — approve, reject, or update rules
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action } = body;
    const gate = await TradeGate.load();

    if (action === "approve") {
      const { proposalId } = body;
      const approved = gate.approve(proposalId);
      if (!approved) return apiError("Proposal not found", 404);
      await gate.save();
      return apiSuccess({ approved, message: `Approved: ${approved.side} ${approved.shares} ${approved.ticker}` });
    }

    if (action === "reject") {
      const { proposalId, reason } = body;
      const rejected = gate.reject(proposalId, reason ?? "Manually rejected");
      if (!rejected) return apiError("Proposal not found", 404);
      await gate.save();
      return apiSuccess({ rejected, message: `Rejected: ${rejected.ticker}` });
    }

    if (action === "approve_all") {
      const approved = gate.approveAll();
      await gate.save();
      return apiSuccess({ approved, count: approved.length });
    }

    if (action === "reject_all") {
      const { reason } = body;
      const rejected = gate.rejectAll(reason ?? "Batch rejected");
      await gate.save();
      return apiSuccess({ rejected, count: rejected.length });
    }

    if (action === "update_rules") {
      const { rules } = body;
      gate.updateRules(rules);
      await gate.save();
      return apiSuccess({ rules: gate.getRules(), message: "Rules updated" });
    }

    return apiError("Unknown action. Use: approve, reject, approve_all, reject_all, update_rules", 400);
  } catch (err) {
    return apiError((err as Error).message, 400);
  }
}
