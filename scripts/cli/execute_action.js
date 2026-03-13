const input = JSON.parse(process.argv[2] || "{}");
const session = input.session;
const actionId = input.actionId;

function recalcMetrics() {
  const total = session.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const cashBalance = session.accounts
    .filter((account) => account.type === "Cash")
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const liquidityMonths = Math.max(1, Number((cashBalance / 800).toFixed(1)));

  session.portfolioMetrics = {
    ...session.portfolioMetrics,
    liquidityMonths
  };
  session.briefing.liquidity = `${liquidityMonths} months`;
  session.briefing.netWorth = `$${(total / 1000).toFixed(1)}K`;
}

function refreshContext() {
  const staleAccounts = session.accounts.filter((account) => account.status === "stale");
  const delayedAccounts = session.accounts.filter((account) => account.status === "delayed");
  session.briefing.context = {
    ...session.briefing.context,
    freshness: staleAccounts.length ? "Degraded" : "Current",
    confidence: staleAccounts.length || delayedAccounts.length ? "Medium" : "Medium to strong",
    missingData: [
      "Checking account not connected",
      ...staleAccounts.map((account) => `${account.provider} prices older than target freshness window`),
      ...delayedAccounts.map((account) => `${account.provider} data is delayed`)
    ]
  };
}

let message = "No action executed.";
let relevantPanels = [];
let activeRoute = "briefing";

if (actionId === "refresh-kraken-data") {
  session.accounts = session.accounts.map((account) =>
    account.provider === "Kraken"
      ? { ...account, status: "current", note: "Sync refreshed just now" }
      : account
  );
  session.briefing.whatChanged[1] = "Kraken data was refreshed successfully, so crypto exposure is now current.";
  message = "Kraken data refreshed through the CLI execution path.";
  relevantPanels = ["account-kraken", "context-freshness"];
  activeRoute = "accounts";
}

if (actionId === "refresh-moomoo-data") {
  session.accounts = session.accounts.map((account) =>
    account.provider === "Moomoo"
      ? { ...account, status: "current", note: "Market data refreshed just now" }
      : account
  );
  message = "Moomoo data refreshed through the CLI execution path.";
  relevantPanels = ["account-moomoo", "context-freshness"];
  activeRoute = "accounts";
}

if (actionId === "trim-crypto-concentration") {
  session.accounts = session.accounts.map((account) => {
    if (account.provider === "Coinbase") {
      return { ...account, balance: Math.max(0, account.balance - 8000), note: "Trim proposal executed in prototype mode" };
    }
    if (account.provider === "Fidelity") {
      return { ...account, balance: account.balance + 8000, note: "Received rotated capital from crypto trim" };
    }
    return account;
  });
  session.briefing.whatChanged[0] = "Crypto concentration was reduced through a prototype rebalance action.";
  message = "Crypto concentration trim executed through the CLI prototype.";
  relevantPanels = ["suggested-actions", "top-items", "account-coinbase"];
  activeRoute = "briefing";
}

if (actionId === "build-defensive-cash-plan") {
  session.accounts = session.accounts.map((account) => {
    if (account.provider === "Fidelity") {
      return { ...account, balance: account.balance - 5000, note: "Funded defensive cash reserve" };
    }
    if (account.provider === "PayPal") {
      return { ...account, balance: account.balance + 5000, note: "Defensive cash reserve increased" };
    }
    return account;
  });
  session.briefing.whatChanged[2] = "Cash reserves were improved through a defensive cash action.";
  message = "Defensive cash plan executed through the CLI prototype.";
  relevantPanels = ["metric-liquidity", "metric-cash-flow", "top-items"];
  activeRoute = "briefing";
}

recalcMetrics();
refreshContext();

process.stdout.write(JSON.stringify({
  session,
  result: {
    message,
    activeRoute,
    relevantPanels
  }
}));
