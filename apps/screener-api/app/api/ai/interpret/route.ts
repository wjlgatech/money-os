import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { explainProposal, explainPosition, generateApprovalReasoning } from "@/lib/ai/claude";

/**
 * POST /api/ai/interpret — AI interprets a specific element
 *
 * Called when user clicks on a stock, position, or proposal.
 * Returns real Claude reasoning, not templates.
 */
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { type, context } = body;

    if (type === "proposal") {
      const interpretation = await explainProposal(context);
      return apiSuccess({ interpretation });
    }

    if (type === "position") {
      const interpretation = await explainPosition(context);
      return apiSuccess({ interpretation });
    }

    if (type === "approval_reasoning") {
      const reasoning = await generateApprovalReasoning(context);
      return apiSuccess({ reasoning });
    }

    return apiError("Unknown type. Use: proposal, position, approval_reasoning", 400);
  } catch (err) {
    return apiError("AI interpretation failed", 500);
  }
}
