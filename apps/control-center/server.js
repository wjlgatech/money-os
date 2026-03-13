const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const publicDir = path.join(__dirname, "public");
const sampleWorkspacePath = path.join(__dirname, "data", "sample-workspace.json");
const sampleWorkspace = JSON.parse(fs.readFileSync(sampleWorkspacePath, "utf8"));

const state = {
  session: null
};

function requireSession(res) {
  if (!state.session) {
    sendJson(res, 404, { error: "Onboarding required" });
    return false;
  }

  return true;
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function runCli(scriptName, payload) {
  const scriptPath = path.join(__dirname, "..", "..", "scripts", "cli", scriptName);
  const result = spawnSync(process.execPath, [scriptPath, JSON.stringify(payload)], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `CLI failed: ${scriptName}`);
  }

  return JSON.parse(result.stdout);
}

function refreshDerivedState(session) {
  const reasoning = runCli("reason_actions.js", { session });
  session.briefing.suggestedActions = reasoning.actions;
  session.briefing.suggestedActionSource = reasoning.source;
  return session;
}

function buildCommanderResponse(query, session) {
  const routed = runCli("tool_router.js", {
    query,
    services: [
      { id: "geopolitics", label: "Geopolitical signals" },
      { id: "market-regime", label: "Market regime" },
      { id: "macro-exposure", label: "Portfolio macro exposure" }
    ]
  });

  const selectedServices = {};
  routed.serviceIds.forEach((serviceId) => {
    if (serviceId === "geopolitics") selectedServices[serviceId] = session.services.geopolitics;
    if (serviceId === "market-regime") selectedServices[serviceId] = session.services.marketRegime;
    if (serviceId === "macro-exposure") selectedServices[serviceId] = session.services.macroExposure;
  });

  const response = runCli("advisor_response.js", {
    query,
    session,
    selectedServices
  });

  return {
    ...response,
    selectedServiceIds: routed.serviceIds,
    toolSource: routed.source
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8"
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function buildSession(profileOverrides = {}) {
  const session = deepCopy({
    onboardingComplete: true,
    userProfile: {
      ...sampleWorkspace.userProfile,
      ...profileOverrides
    },
    accounts: sampleWorkspace.accounts,
    briefing: sampleWorkspace.briefing,
    portfolioMetrics: sampleWorkspace.portfolioMetrics,
    services: sampleWorkspace.services
  });

  return refreshDerivedState(session);
}

function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/session") {
    sendJson(res, 200, {
      onboardingComplete: Boolean(state.session),
      session: state.session
    });
    return true;
  }

  if (req.method === "POST" && req.url === "/api/onboarding/sample") {
    readBody(req)
      .then((body) => {
        state.session = buildSession({
          name: body.name || sampleWorkspace.userProfile.name,
          riskTolerance: body.riskTolerance || sampleWorkspace.userProfile.riskTolerance,
          timeHorizon: body.timeHorizon || sampleWorkspace.userProfile.timeHorizon,
          liquidityNeed: body.liquidityNeed || sampleWorkspace.userProfile.liquidityNeed
        });
        sendJson(res, 200, { ok: true, session: state.session });
      })
      .catch(() => {
        sendJson(res, 400, { error: "Invalid request body" });
      });
    return true;
  }

  if (req.method === "GET" && req.url === "/api/briefing") {
    if (!requireSession(res)) return true;

    sendJson(res, 200, state.session);
    return true;
  }

  if (req.method === "GET" && req.url === "/api/signals/geopolitics") {
    if (!requireSession(res)) return true;
    sendJson(res, 200, state.session.services.geopolitics);
    return true;
  }

  if (req.method === "GET" && req.url === "/api/signals/market-regime") {
    if (!requireSession(res)) return true;
    sendJson(res, 200, state.session.services.marketRegime);
    return true;
  }

  if (req.method === "GET" && req.url === "/api/exposure/macro") {
    if (!requireSession(res)) return true;
    sendJson(res, 200, state.session.services.macroExposure);
    return true;
  }

  if (req.method === "POST" && req.url === "/api/command") {
    if (!requireSession(res)) return true;

    readBody(req)
      .then((body) => {
        sendJson(res, 200, {
          ok: true,
          command: buildCommanderResponse(body.query, state.session),
          session: state.session
        });
      })
      .catch(() => {
        sendJson(res, 400, { error: "Invalid request body" });
      });
    return true;
  }

  if (req.method === "POST" && req.url === "/api/actions") {
    if (!requireSession(res)) return true;

    readBody(req)
      .then((body) => {
        const executed = runCli("execute_action.js", {
          session: state.session,
          actionId: body.actionId
        });
        state.session = refreshDerivedState(executed.session);
        sendJson(res, 200, {
          ok: true,
          result: executed.result,
          session: state.session
        });
      })
      .catch(() => {
        sendJson(res, 400, { error: "Invalid request body" });
      });
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url.startsWith("/api/")) {
    const handled = handleApi(req, res);
    if (!handled) {
      sendJson(res, 404, { error: "Unknown API route" });
    }
    return;
  }

  const normalizedPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(publicDir, normalizedPath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  sendFile(res, filePath);
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

server.listen(port, host, () => {
  console.log(`money-os control center running at http://${host}:${port}`);
});
