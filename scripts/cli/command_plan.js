const {
  buildApiCatalog,
  buildUiCatalog,
  getPortfolioSnapshot,
  callOpenAIJson
} = require("./lib/llm_client");

const input = JSON.parse(process.argv[2] || "{}");
const session = input.session;
const query = input.query || "";

function fallbackPlan() {
  const actions = buildApiCatalog(session);
  const normalized = query.toLowerCase();

  if (!normalized.trim() || ["hi", "hello", "hey"].includes(normalized.trim())) {
    return {
      answer: `Hi ${session.userProfile.name}. Right now I would focus on three things: refresh stale exchange data, reduce crypto concentration risk, and rebuild the cash buffer toward your 6-month target.`,
      activeRoute: "briefing",
      relevantPanels: ["what-changed", "suggested-actions", "top-items", "metric-liquidity"],
      relatedData: [
        session.briefing.whatChanged[1],
        `Liquidity is ${session.portfolioMetrics.liquidityMonths} months versus a ${session.portfolioMetrics.targetLiquidityMonths}-month target.`,
        `${session.briefing.suggestedActions.length} suggested actions are available right now.`
      ],
      selectedActionIds: actions.slice(0, 3).map((action) => action.id)
    };
  }

  if (normalized.includes("crypto")) {
    return {
      answer: "Crypto concentration is a primary near-term risk in this workspace, and stale exchange data can hide true exposure.",
      activeRoute: "accounts",
      relevantPanels: ["account-coinbase", "account-kraken", "context-missing-data"],
      relatedData: ["Coinbase and Kraken are the crypto-related sources in this workspace."],
      selectedActionIds: actions.filter((action) => action.id.includes("crypto") || action.id.includes("kraken")).map((action) => action.id)
    };
  }

  if (normalized.includes("cash") || normalized.includes("liquidity")) {
    return {
      answer: "Liquidity is below target, so the cash buffer and defensive planning surfaces matter most right now.",
      activeRoute: "briefing",
      relevantPanels: ["metric-liquidity", "metric-cash-flow", "top-items"],
      relatedData: [`Liquidity is ${session.portfolioMetrics.liquidityMonths} months.`],
      selectedActionIds: actions.filter((action) => action.id.includes("cash")).map((action) => action.id)
    };
  }

  return {
    answer: "The most relevant issues are stale data, crypto concentration, and the cash buffer below target.",
    activeRoute: "briefing",
    relevantPanels: ["what-changed", "suggested-actions", "top-items", "context-missing-data"],
    relatedData: [session.briefing.whatChanged[1], session.briefing.topItems[2]],
    selectedActionIds: actions.slice(0, 3).map((action) => action.id)
  };
}

async function run() {
  const apiCatalog = buildApiCatalog(session);
  const uiCatalog = buildUiCatalog();
  const fallback = fallbackPlan();

  const llmPlan = await callOpenAIJson(
    [
      "You are the chief commander planner for a personal finance operating system.",
      "Choose which UI route to open, which panels to highlight, and which available API actions to surface.",
      "Do not invent routes, panels, or API ids beyond those provided.",
      "Return strict JSON with keys: answer, activeRoute, relevantPanels, relatedData, selectedActionIds."
    ].join(" "),
    {
      query,
      portfolio: getPortfolioSnapshot(session),
      availableApis: apiCatalog,
      availableUi: uiCatalog,
      fallbackReference: fallback
    }
  ).catch(() => null);

  const plan = llmPlan || fallback;
  const actions = apiCatalog.filter((action) => plan.selectedActionIds.includes(action.id));

  process.stdout.write(JSON.stringify({
    query,
    answer: plan.answer,
    activeRoute: plan.activeRoute,
    relevantPanels: plan.relevantPanels,
    relatedData: plan.relatedData,
    actions,
    source: llmPlan ? "llm" : "fallback"
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
