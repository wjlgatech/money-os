const input = JSON.parse(process.argv[2] || "{}");
const session = input.session;
const {
  buildApiCatalog,
  getPortfolioSnapshot,
  callOpenAIJson
} = require("./lib/llm_client");

function totalBalance(accounts) {
  return accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildFallbackActions() {
  const actions = [];
  const total = totalBalance(session.accounts);
  const cryptoBalance = session.accounts
    .filter((account) => account.type === "Crypto")
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const cryptoRatio = total === 0 ? 0 : cryptoBalance / total;
  const staleAccounts = session.accounts.filter((account) => account.status === "stale" || account.status === "delayed");
  const metrics = session.portfolioMetrics || {};

  if (cryptoRatio > (metrics.targetCryptoAllocation || 0.12)) {
    actions.push({
      id: "trim-crypto-concentration",
      title: "Trim crypto concentration",
      impact: "Bring concentration closer to target and reduce downside sensitivity.",
      reasoning: `Crypto is ${formatPercent(cryptoRatio)} of tracked assets versus a target of ${formatPercent(metrics.targetCryptoAllocation || 0.12)}.`,
      priority: 1
    });
  }

  staleAccounts.forEach((account) => {
    actions.push({
      id: `refresh-${account.provider.toLowerCase()}-data`,
      title: `Refresh stale ${account.provider} data`,
      impact: "Increase confidence before any portfolio change.",
      reasoning: `${account.provider} is marked ${account.status}, so dependent analytics may be inaccurate.`,
      priority: account.status === "stale" ? 2 : 3
    });
  });

  if ((metrics.liquidityMonths || 0) < (metrics.targetLiquidityMonths || 6)) {
    actions.push({
      id: "build-defensive-cash-plan",
      title: "Build a defensive cash plan",
      impact: "Restore liquidity buffer without forcing immediate sales.",
      reasoning: `Liquidity is ${metrics.liquidityMonths} months against a target of ${metrics.targetLiquidityMonths} months.`,
      priority: 4
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

async function run() {
  const fallbackActions = buildFallbackActions();
  const apiCatalog = buildApiCatalog(session);

  const llmResult = await callOpenAIJson(
    [
      "You are a portfolio action reasoner for a finance operating system.",
      "Choose the best suggested actions from the available API catalog based on the portfolio state.",
      "Only choose ids that exist in the provided availableApis list.",
      "Return strict JSON with key actions.",
      "Each action must include: id, title, impact, reasoning, priority."
    ].join(" "),
    {
      portfolio: getPortfolioSnapshot(session),
      availableApis: apiCatalog,
      fallbackReference: fallbackActions
    }
  ).catch(() => null);

  if (llmResult && Array.isArray(llmResult.actions) && llmResult.actions.length) {
    process.stdout.write(JSON.stringify({
      actions: llmResult.actions,
      source: "llm"
    }));
    return;
  }

  process.stdout.write(JSON.stringify({
    actions: fallbackActions,
    source: "fallback"
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
