const { spawn } = require("child_process");
const assert = require("assert");

const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(url, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/session`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error("Server did not become ready");
}

async function run() {
  const server = spawn(process.execPath, ["apps/control-center/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(baseUrl);

    const sessionResponse = await fetch(`${baseUrl}/api/session`);
    const sessionPayload = await sessionResponse.json();
    assert.equal(sessionPayload.onboardingComplete, false);

    const onboardingResponse = await fetch(`${baseUrl}/api/onboarding/sample`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Smoke Test",
        riskTolerance: "Moderate",
        timeHorizon: "3 to 5 years",
        liquidityNeed: "High"
      })
    });

    const onboardingPayload = await onboardingResponse.json();
    assert.equal(onboardingPayload.ok, true);
    assert.equal(onboardingPayload.session.userProfile.name, "Smoke Test");

    const briefingResponse = await fetch(`${baseUrl}/api/briefing`);
    const briefingPayload = await briefingResponse.json();
    assert.equal(briefingPayload.userProfile.name, "Smoke Test");
    assert.equal(briefingPayload.briefing.context.freshness, "Degraded");
    assert.ok(briefingPayload.accounts.length >= 5);
    assert.ok(Array.isArray(briefingPayload.briefing.suggestedActions));
    assert.ok(briefingPayload.briefing.suggestedActions.length >= 2);

    const commandResponse = await fetch(`${baseUrl}/api/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "What signal from Iran-US war do you get?"
      })
    });
    const commandPayload = await commandResponse.json();
    assert.equal(commandPayload.ok, true);
    assert.equal(commandPayload.command.activeRoute, "briefing");
    assert.ok(commandPayload.command.actions.length >= 1);
    assert.ok(commandPayload.command.source);
    assert.ok(Array.isArray(commandPayload.command.evidenceCards));
    assert.ok(commandPayload.command.selectedServiceIds.includes("geopolitics"));

    const geopoliticsResponse = await fetch(`${baseUrl}/api/signals/geopolitics`);
    const geopoliticsPayload = await geopoliticsResponse.json();
    assert.ok(Array.isArray(geopoliticsPayload.signals));

    const exposureResponse = await fetch(`${baseUrl}/api/exposure/macro`);
    const exposurePayload = await exposureResponse.json();
    assert.ok(Array.isArray(exposurePayload.topExposures));

    const actionResponse = await fetch(`${baseUrl}/api/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actionId: "refresh-kraken-data"
      })
    });
    const actionPayload = await actionResponse.json();
    assert.equal(actionPayload.ok, true);
    assert.equal(actionPayload.session.briefing.context.freshness, "Current");

    console.log("Smoke test passed: onboarding, commander flow, and action APIs are working.");
  } finally {
    server.kill("SIGTERM");
  }

  if (stderr) {
    process.stderr.write(stderr);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
