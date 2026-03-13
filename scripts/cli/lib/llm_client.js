const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.MONEY_OS_OPENAI_MODEL || "gpt-5.2-pro";

function buildApiCatalog(session) {
  const catalog = [];

  session.accounts.forEach((account) => {
    if (account.status === "stale" || account.status === "delayed") {
      catalog.push({
        id: `refresh-${account.provider.toLowerCase()}-data`,
        label: `Refresh ${account.provider} data`,
        effect: `Refresh ${account.provider} account data and update freshness signals.`,
        route: "accounts"
      });
    }
  });

  catalog.push({
    id: "trim-crypto-concentration",
    label: "Trim crypto concentration",
    effect: "Prototype portfolio rebalance that reduces crypto weight and rotates capital.",
    route: "briefing"
  });
  catalog.push({
    id: "build-defensive-cash-plan",
    label: "Build defensive cash plan",
    effect: "Prototype cash allocation action that improves liquidity buffer.",
    route: "briefing"
  });

  return catalog;
}

function buildUiCatalog() {
  return {
    routes: ["briefing", "what-changed", "accounts"],
    panels: [
      "what-changed",
      "suggested-actions",
      "top-items",
      "metric-net-worth",
      "metric-liquidity",
      "metric-risk-posture",
      "metric-cash-flow",
      "context-freshness",
      "context-included-accounts",
      "context-missing-data",
      "account-fidelity",
      "account-moomoo",
      "account-coinbase",
      "account-kraken",
      "account-paypal"
    ]
  };
}

function getPortfolioSnapshot(session) {
  return {
    userProfile: session.userProfile,
    accounts: session.accounts,
    briefing: {
      headline: session.briefing.headline,
      whatChanged: session.briefing.whatChanged,
      topItems: session.briefing.topItems,
      context: session.briefing.context
    },
    portfolioMetrics: session.portfolioMetrics
  };
}

async function callOpenAIJson(systemPrompt, inputPayload) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(inputPayload)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const payload = await response.json();
  const text = extractText(payload);
  return JSON.parse(text);
}

function extractText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new Error("No text output returned from OpenAI response");
}

module.exports = {
  buildApiCatalog,
  buildUiCatalog,
  getPortfolioSnapshot,
  callOpenAIJson
};
