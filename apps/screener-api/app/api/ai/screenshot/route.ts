import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { extractPortfolioFromImage } from "@/lib/ai/claude";

/**
 * POST /api/ai/screenshot — Extract portfolio from broker screenshot
 *
 * User drops/uploads an image of their broker's positions page.
 * Claude vision reads it and extracts all holdings.
 */
export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { image, mimeType } = body;

    if (!image || typeof image !== "string") {
      return apiError("image (base64) is required", 400);
    }

    const result = await extractPortfolioFromImage(image, mimeType ?? "image/png");

    // Try to parse as JSON
    let holdings: unknown[] = [];
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        holdings = JSON.parse(jsonMatch[0]);
      }
    } catch { /* Claude returned non-JSON, return raw text */ }

    return apiSuccess({
      holdings,
      raw: result,
      message: `Extracted ${holdings.length} position${holdings.length !== 1 ? "s" : ""} from screenshot`,
    });
  } catch (err) {
    return apiError("Screenshot extraction failed", 500);
  }
}
