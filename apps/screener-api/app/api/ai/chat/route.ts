import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { answerQuestion } from "@/lib/ai/claude";

/**
 * POST /api/ai/chat — Real AI chat with portfolio context
 *
 * Not a fake keyword matcher. Real Claude reasoning about the user's
 * specific portfolio, positions, and market situation.
 */
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { question, context } = body;

    if (!question || typeof question !== "string") {
      return apiError("question is required", 400);
    }

    const answer = await answerQuestion(question, context ?? {
      portfolioEquity: 0,
      positions: [],
      pendingApprovals: [],
      regime: "unknown",
      vix: 0,
      userLevel: "beginner",
    });

    return apiSuccess({ answer });
  } catch (err) {
    return apiError("AI chat failed", 500);
  }
}
