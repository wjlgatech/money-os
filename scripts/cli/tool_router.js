const { callOpenAIJson } = require("./lib/llm_client");

const input = JSON.parse(process.argv[2] || "{}");
const query = input.query || "";
const services = input.services || [];

function fallbackSelection() {
  const normalized = query.toLowerCase();
  if (normalized.includes("iran") || normalized.includes("war") || normalized.includes("geopolit")) {
    return {
      serviceIds: ["geopolitics", "market-regime", "macro-exposure"]
    };
  }

  if (normalized.includes("crypto")) {
    return {
      serviceIds: ["macro-exposure"]
    };
  }

  return {
    serviceIds: ["market-regime", "macro-exposure"]
  };
}

async function run() {
  const fallback = fallbackSelection();

  const llmSelection = await callOpenAIJson(
    [
      "You are a tool router for a finance advisor.",
      "Choose which services to call based on the user query.",
      "Only return service ids that exist in availableServices.",
      "Return strict JSON with key serviceIds."
    ].join(" "),
    {
      query,
      availableServices: services,
      fallbackReference: fallback
    }
  ).catch(() => null);

  const selected = llmSelection && Array.isArray(llmSelection.serviceIds) && llmSelection.serviceIds.length
    ? llmSelection
    : fallback;

  process.stdout.write(JSON.stringify({
    serviceIds: selected.serviceIds,
    source: llmSelection ? "llm" : "fallback"
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
