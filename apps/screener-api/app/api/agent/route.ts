import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { MoneyAgent, type AgentRules } from "@/lib/agent/core";

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
      return apiSuccess({ result, message: `${proposal.ticker} order submitted` });
    }

    if (action === "skip") {
      const { proposalId } = body;
      const skipped = agent.skipProposal(proposalId);
      return apiSuccess({ skipped, message: skipped ? "Proposal skipped" : "Proposal not found" });
    }

    if (action === "update_rules") {
      const { rules } = body as { rules: Partial<AgentRules> };

      // Validate dangerous rule changes
      const errors: string[] = [];
      if (rules.autoBuyBelow !== undefined && rules.autoBuyBelow > 10000) {
        errors.push("autoBuyBelow cannot exceed $10,000");
      }
      if (rules.maxExposurePct !== undefined && (rules.maxExposurePct < 10 || rules.maxExposurePct > 80)) {
        errors.push("maxExposurePct must be between 10% and 80%");
      }
      if (rules.maxNewPositionsPerDay !== undefined && rules.maxNewPositionsPerDay > 10) {
        errors.push("maxNewPositionsPerDay cannot exceed 10");
      }
      if (rules.vixPauseThreshold !== undefined && rules.vixPauseThreshold > 50) {
        errors.push("vixPauseThreshold cannot exceed 50 (that would disable panic protection)");
      }
      // autoStopLoss can never be set to false
      if ("autoStopLoss" in rules && rules.autoStopLoss !== true) {
        errors.push("autoStopLoss cannot be disabled — this is a non-negotiable safety rule");
      }

      if (errors.length > 0) {
        return apiError(`Rule validation failed: ${errors.join("; ")}`, 400);
      }

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
    return apiError("Agent operation failed", 500);
  }
}
