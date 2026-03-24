import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { STRATEGY_TEMPLATES, validateStrategy, type StrategyDefinition } from "@/lib/engine/strategyDef";

export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { strategy, templateName } = body as {
      strategy?: StrategyDefinition;
      templateName?: string;
    };

    // Use template if specified
    const stratDef = templateName
      ? STRATEGY_TEMPLATES[templateName]
      : strategy;

    if (!stratDef) {
      return apiError(
        `Strategy not found. Available templates: ${Object.keys(STRATEGY_TEMPLATES).join(", ")}`,
        400
      );
    }

    const validation = validateStrategy(stratDef);
    if (!validation.valid) {
      return apiError(`Invalid strategy: ${validation.errors.join(", ")}`, 400);
    }

    // For now, return the strategy card + available templates
    // Full universal backtester will execute any strategy definition
    return apiSuccess({
      strategyCard: {
        name: stratDef.name,
        source: stratDef.source,
        description: stratDef.description,
        thesis: stratDef.thesis,
        entryConditions: stratDef.entryConditions.length,
        exitRules: {
          takeProfit: stratDef.exitConditions.takeProfit,
          stopLoss: stratDef.exitConditions.stopLoss,
          timeLimit: stratDef.exitConditions.timeLimit ?? null,
        },
        sizing: stratDef.sizing,
        filters: stratDef.filters ?? null,
        universe: stratDef.universe,
      },
      message: "Strategy validated. Backtest execution ready.",
      availableTemplates: Object.keys(STRATEGY_TEMPLATES),
    });
  } catch (err) {
    return apiError((err as Error).message, 400);
  }
}

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  // List available strategy templates
  const templates = Object.entries(STRATEGY_TEMPLATES).map(([key, def]) => ({
    id: key,
    name: def.name,
    source: def.source,
    description: def.description,
    thesis: def.thesis,
  }));

  return apiSuccess({ templates, count: templates.length });
}
