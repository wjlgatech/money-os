import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { MoneyAgent } from "@/lib/agent/core";

// GET — latest agent report + status
export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const agent = await MoneyAgent.load();
  const report = agent.getLastReport();
  const rules = agent.getRules();

  return apiSuccess({ report, rules });
}

// POST — approve/reject proposals, update rules, trigger cycle
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action } = body;
    const agent = await MoneyAgent.load();

    if (action === "approve") {
      const { proposal } = body;
      const result = await agent.approveProposal(proposal);
      return apiSuccess({ result });
    }

    if (action === "update_rules") {
      const { rules } = body;
      agent.updateRules(rules);
      await agent.save();
      return apiSuccess({ rules: agent.getRules(), message: "Rules updated" });
    }

    if (action === "pause") {
      agent.updateRules({ pauseNewEntries: true });
      await agent.save();
      return apiSuccess({ message: "Agent paused. No new entries will be made." });
    }

    if (action === "resume") {
      agent.updateRules({ pauseNewEntries: false });
      await agent.save();
      return apiSuccess({ message: "Agent resumed. New entries will be evaluated." });
    }

    return apiError("Unknown action. Use: approve, update_rules, pause, resume", 400);
  } catch (err) {
    return apiError((err as Error).message, 400);
  }
}
