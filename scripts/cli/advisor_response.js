const {
  buildApiCatalog,
  buildUiCatalog,
  getPortfolioSnapshot,
  callOpenAIJson
} = require("./lib/llm_client");

const input = JSON.parse(process.argv[2] || "{}");
const query = input.query || "";
const session = input.session;
const selectedServices = input.selectedServices || {};

function fallbackAdvisor() {
  const normalized = query.toLowerCase();
  const actions = buildApiCatalog(session);

  if (normalized.includes("iran") || normalized.includes("war") || normalized.includes("geopolit")) {
    return {
      answer: "The main signal from the Iran-US war escalation is higher oil and shipping risk, which raises the odds of a risk-off market tone. In your portfolio, that matters less for your energy-linked equity exposure and more for your crypto beta and below-target cash buffer.",
      activeRoute: "briefing",
      relevantPanels: ["what-changed", "suggested-actions", "top-items", "metric-liquidity"],
      relatedData: [
        "Oil sensitivity is the fastest transmission channel.",
        "Portfolio vulnerability is concentrated in crypto beta and cash buffer weakness."
      ],
      selectedActionIds: actions.filter((action) =>
        action.id.includes("crypto") || action.id.includes("cash") || action.id.includes("kraken")
      ).map((action) => action.id),
      evidenceCards: [
        {
          title: selectedServices.geopolitics?.signals?.[0]?.headline || "Shipping risk elevated",
          body: selectedServices.geopolitics?.signals?.[0]?.summary || "Geopolitical escalation raises freight and oil risk.",
          source: "geopolitics"
        },
        {
          title: "Portfolio macro exposure",
          body: selectedServices["macro-exposure"]?.portfolioView || "Crypto beta and liquidity are the main weak points.",
          source: "macro-exposure"
        }
      ]
    };
  }

  return {
    answer: `Hi ${session.userProfile.name}. The most relevant issues remain data freshness, crypto concentration, and the liquidity buffer below target.`,
    activeRoute: "briefing",
    relevantPanels: ["what-changed", "suggested-actions", "top-items"],
    relatedData: [`${session.briefing.suggestedActions.length} suggested actions are available right now.`],
    selectedActionIds: actions.slice(0, 3).map((action) => action.id),
    evidenceCards: [
      {
        title: "Current market regime",
        body: selectedServices["market-regime"]?.summary || "Cautious risk regime.",
        source: "market-regime"
      }
    ]
  };
}

async function run() {
  const fallback = fallbackAdvisor();
  const apiCatalog = buildApiCatalog(session);
  const uiCatalog = buildUiCatalog();

  const llmResponse = await callOpenAIJson(
    [
      "You are a grounded personal finance advisor.",
      "Use the selected service data to answer the user's question in a useful advisory tone.",
      "Pick which UI route to open, which panels to highlight, which API actions to surface, and which evidence cards to show.",
      "Do not invent action ids, routes, or panel ids outside the provided catalogs.",
      "Return strict JSON with keys: answer, activeRoute, relevantPanels, relatedData, selectedActionIds, evidenceCards."
    ].join(" "),
    {
      query,
      portfolio: getPortfolioSnapshot(session),
      selectedServices,
      availableApis: apiCatalog,
      availableUi: uiCatalog,
      fallbackReference: fallback
    }
  ).catch(() => null);

  const plan = llmResponse || fallback;
  const actions = apiCatalog.filter((action) => plan.selectedActionIds.includes(action.id));

  process.stdout.write(JSON.stringify({
    answer: plan.answer,
    activeRoute: plan.activeRoute,
    relevantPanels: plan.relevantPanels,
    relatedData: plan.relatedData,
    actions,
    evidenceCards: plan.evidenceCards || [],
    source: llmResponse ? "llm" : "fallback"
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
