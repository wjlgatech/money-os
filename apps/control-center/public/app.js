const state = {
  session: null,
  route: "briefing",
  loading: true,
  error: "",
  commandInput: "What should I pay attention to this week?",
  commander: null,
  commandBusy: false
};

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function mount() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (state.loading) {
    app.appendChild(el(`
      <div class="shell">
        <div class="panel main loading">Loading money-os...</div>
      </div>
    `));
    return;
  }

  if (!state.session) {
    app.appendChild(renderOnboarding());
    return;
  }

  app.appendChild(renderAppShell());
}

function renderOnboarding() {
  const root = el(`
    <div class="shell">
      <div class="panel main form-card">
        <div class="hero">
          <div class="eyebrow">Money OS</div>
          <div class="hero-copy">
            <div>
              <h1>Start with clarity, not complexity.</h1>
              <p class="muted">This first slice gets a user from zero to a meaningful financial briefing in one session using a sample workspace backed by real API calls.</p>
            </div>
            <span class="badge">Prototype flow 01</span>
          </div>
        </div>
        <div class="card">
          <strong>What this prototype does</strong>
          <p>It simulates a first-time setup, stores a user profile, loads a sample multi-account workspace, and renders a briefing with freshness and confidence context.</p>
        </div>
        <form id="onboarding-form" class="grid">
          <div class="form-grid">
            <label class="field">
              <div class="muted">Your name</div>
              <input name="name" value="Alex" />
            </label>
            <label class="field">
              <div class="muted">Risk tolerance</div>
              <select name="riskTolerance">
                <option>Conservative</option>
                <option selected>Moderate</option>
                <option>Growth</option>
              </select>
            </label>
            <label class="field">
              <div class="muted">Time horizon</div>
              <select name="timeHorizon">
                <option>0 to 12 months</option>
                <option>1 to 3 years</option>
                <option selected>3 to 5 years</option>
                <option>5+ years</option>
              </select>
            </label>
            <label class="field">
              <div class="muted">Liquidity need</div>
              <select name="liquidityNeed">
                <option>Low</option>
                <option>Moderate</option>
                <option selected>High</option>
              </select>
            </label>
            <div class="field wide">
              <div class="muted">Sample workspace</div>
              <strong>Fidelity, Moomoo, Coinbase, Kraken, and PayPal seeded with freshness warnings</strong>
            </div>
          </div>
          <div class="button-row">
            <button class="primary-button" type="submit">Use sample workspace</button>
          </div>
          ${state.error ? `<div class="card"><strong>Setup failed</strong><p>${state.error}</p></div>` : ""}
        </form>
      </div>
    </div>
  `);

  root.querySelector("#onboarding-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = "";
    state.loading = true;
    mount();

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const result = await api("/api/onboarding/sample", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.session = result.session;
      await hydrateCommander("hi");
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
      mount();
    }
  });

  return root;
}

function renderAppShell() {
  const session = state.session;
  const root = el(`
    <div class="shell">
      <div class="frame">
        <aside class="panel sidebar">
          <div class="brand">
            <div class="eyebrow">Money OS</div>
            <h1>Decision workspace</h1>
            <p>Conversational entry, structured review, and visible confidence.</p>
          </div>
          <div class="nav">
            <button class="${state.route === "briefing" ? "active" : ""}" data-route="briefing">Briefing</button>
            <button class="${state.route === "what-changed" ? "active" : ""}" data-route="what-changed">What Changed</button>
            <button class="${state.route === "accounts" ? "active" : ""}" data-route="accounts">Accounts</button>
          </div>
          <div class="card">
            <strong>${session.userProfile.name}</strong>
            <p>${session.userProfile.riskTolerance} risk tolerance, ${session.userProfile.timeHorizon}, ${session.userProfile.liquidityNeed.toLowerCase()} liquidity need.</p>
          </div>
          <div class="card">
            <strong>Goals</strong>
            <div class="list">
              ${session.userProfile.goals.map((goal) => `<div class="list-item"><span>${goal}</span></div>`).join("")}
            </div>
          </div>
        </aside>
        <main class="panel main"></main>
        <aside class="panel context"></aside>
      </div>
    </div>
  `);

  root.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.getAttribute("data-route");
      mount();
    });
  });

  root.querySelector(".main").appendChild(renderCommandCenter());
  root.querySelector(".main").appendChild(renderRoute());
  root.querySelector(".context").appendChild(renderContextPanel(state.session.briefing.context));
  return root;
}

function renderRoute() {
  if (state.route === "what-changed") {
    return renderWhatChanged();
  }
  if (state.route === "accounts") {
    return renderAccounts();
  }
  return renderBriefing();
}

function renderBriefing() {
  const briefing = state.session.briefing;
  return el(`
    <div class="grid">
      <section class="hero">
        <div class="eyebrow">Briefing</div>
        <div class="hero-copy">
          <div>
            <h1>${briefing.headline}</h1>
            <p class="muted">The command center above is not only chat. It answers, opens the right workspace, highlights relevant panels, and exposes action APIs.</p>
          </div>
          <div class="hero-actions">
            <span class="badge warn">${briefing.context.freshness} freshness</span>
            <span class="badge">${briefing.context.confidence} confidence</span>
            <span class="badge">${briefing.suggestedActionSource === "llm" ? "LLM suggestions" : "Fallback suggestions"}</span>
            ${state.commander ? `<span class="badge">${state.commander.toolSource === "llm" ? "LLM tool routing" : "Fallback tool routing"}</span>` : ""}
          </div>
        </div>
      </section>
      <section class="grid metrics">
        ${metricCard("Net worth", briefing.netWorth, "metric-net-worth")}
        ${metricCard("Liquidity", briefing.liquidity, "metric-liquidity")}
        ${metricCard("Risk posture", briefing.riskPosture, "metric-risk-posture")}
        ${metricCard("Cash flow", briefing.cashFlow, "metric-cash-flow")}
      </section>
      <section class="grid dual">
        <div class="${panelClass("what-changed")}">
          <strong>What changed</strong>
          <div class="list">
            ${briefing.whatChanged.map((item) => `<div class="timeline"><p>${item}</p></div>`).join("")}
          </div>
        </div>
        <div class="${panelClass("suggested-actions")}">
          <strong>Suggested actions</strong>
          <div class="list">
            ${briefing.suggestedActions.map((action) => `
              <div class="timeline">
                <strong>${action.title}</strong>
                <p>${action.impact}</p>
                <p class="reasoning-copy">${action.reasoning}</p>
                <button class="secondary-button suggested-action-trigger" type="button" data-action-id="${action.id}">Agree and execute</button>
              </div>`).join("")}
          </div>
        </div>
      </section>
      <section class="${panelClass("top-items")}">
        <strong>Top three items to review</strong>
        <div class="list">
          ${briefing.topItems.map((item) => `<div class="list-item"><span>${item}</span></div>`).join("")}
        </div>
      </section>
    </div>
  `);

  root.querySelectorAll(".suggested-action-trigger").forEach((button) => {
    button.addEventListener("click", () => runAction(button.getAttribute("data-action-id")));
  });

  return root;
}

function renderWhatChanged() {
  const items = state.session.briefing.whatChanged;
  return el(`
    <div class="grid">
      <section class="hero">
        <div class="eyebrow">What Changed</div>
        <div class="hero-copy">
          <div>
            <h1>Movement is only useful when tied to your actual exposure.</h1>
            <p class="muted">The command center can route users here directly and highlight the exact sections that justify its answer.</p>
          </div>
          <button class="secondary-button" type="button">Run scenario</button>
        </div>
      </section>
      <section class="${panelClass("what-changed")}">
        <strong>Change timeline</strong>
        <div class="list">
          ${items.map((item, index) => `
            <div class="timeline">
              <strong>Change ${index + 1}</strong>
              <p>${item}</p>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `);
}

function renderAccounts() {
  const accounts = state.session.accounts;
  return el(`
    <div class="grid">
      <section class="hero">
        <div class="eyebrow">Accounts</div>
        <div class="hero-copy">
          <div>
            <h1>Trust depends on knowing which sources are current and which are not.</h1>
            <p class="muted">The command center can bring users here and highlight the exact providers that matter for the current question.</p>
          </div>
          <button class="ghost-button" type="button">Retry stale sync</button>
        </div>
      </section>
      <section class="card">
        <strong>Connected sources</strong>
        <div class="status-list">
          ${accounts.map((account) => `
            <div class="status-row ${rowClass(`account-${account.provider.toLowerCase()}`)}">
              <div>
                <strong>${account.provider}</strong>
                <p class="muted">${account.type} · ${account.note}</p>
              </div>
              <div>
                <span class="status-pill">${account.status}</span>
                <div class="muted">${formatMoney(account.balance)}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `);
}

function renderContextPanel(context) {
  return el(`
    <div>
      <div class="context-section ${highlightClass("context-freshness")}">
        <span class="badge warn">${context.freshness} freshness</span>
        <p>Confidence is ${context.confidence.toLowerCase()} because one crypto provider may be stale and a checking account is not yet included.</p>
      </div>
      <div class="context-section ${highlightClass("context-included-accounts")}">
        <strong>Included accounts</strong>
        <div class="list">
          ${context.includedAccounts.map((item) => `<div class="list-item"><span>${item}</span></div>`).join("")}
        </div>
      </div>
      <div class="context-section ${highlightClass("context-missing-data")}">
        <strong>Missing or degraded data</strong>
        <div class="list">
          ${context.missingData.map((item) => `<div class="list-item"><span>${item}</span></div>`).join("")}
        </div>
      </div>
    </div>
  `);
}

function renderCommandCenter() {
  const commander = state.commander;
  const root = el(`
    <section class="card commander-shell">
      <div class="eyebrow">Chief Commander Center</div>
      <div class="ask-bar">
        <input id="command-input" aria-label="Chief commander input" value="${escapeHtml(state.commandInput)}" />
        <button class="primary-button" type="button" id="submit-command">${state.commandBusy ? "Working..." : "Run command"}</button>
      </div>
      <div class="suggested-prompts">
        <button class="chip" data-prompt="What should I pay attention to this week?">Weekly focus</button>
        <button class="chip" data-prompt="Am I too exposed to crypto?">Crypto exposure</button>
        <button class="chip" data-prompt="How is my liquidity position?">Liquidity</button>
      </div>
      ${commander ? `
        <div class="commander-grid">
          <div class="card">
            <strong>Answer</strong>
            <p>${commander.answer}</p>
          </div>
          <div class="card">
            <strong>Relevant info opened for you</strong>
            <div class="list">
              ${commander.relatedData.map((item) => `<div class="list-item"><span>${item}</span></div>`).join("")}
            </div>
          </div>
          <div class="card">
            <strong>Evidence from services</strong>
            <div class="list">
              ${(commander.evidenceCards || []).map((item) => `
                <div class="timeline">
                  <strong>${item.title}</strong>
                  <p>${item.body}</p>
                  <p class="reasoning-copy">Source: ${item.source}</p>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="card">
            <strong>Action controls</strong>
            <div class="list">
              ${commander.actions.map((action) => `
                <div class="timeline">
                  <strong>${action.title || action.label}</strong>
                  <p>${action.effect || action.description || action.impact || ""}</p>
                  <button class="secondary-button action-trigger" type="button" data-action-id="${action.id}">Run API action</button>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      ` : `
        <div class="commander-empty muted">This input is not only chat. It routes across signal services, pulls relevant evidence, and exposes action controls for backend APIs.</div>
      `}
      ${commander ? `<div class="muted">Planner source: ${commander.source}. Tool router: ${commander.toolSource}. Services used: ${(commander.selectedServiceIds || []).join(", ")}</div>` : ""}
      ${state.error ? `<div class="card"><strong>Command error</strong><p>${escapeHtml(state.error)}</p></div>` : ""}
    </section>
  `);

  root.querySelector("#command-input").addEventListener("input", (event) => {
    state.commandInput = event.target.value;
  });
  root.querySelector("#submit-command").addEventListener("click", submitCommand);
  root.querySelector("#command-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitCommand();
    }
  });
  root.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      state.commandInput = button.getAttribute("data-prompt");
      mount();
      submitCommand();
    });
  });
  root.querySelectorAll(".action-trigger").forEach((button) => {
    button.addEventListener("click", () => runAction(button.getAttribute("data-action-id")));
  });

  return root;
}

async function submitCommand() {
  state.commandBusy = true;
  state.error = "";
  mount();

  try {
    await hydrateCommander(state.commandInput);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.commandBusy = false;
    mount();
  }
}

async function runAction(actionId) {
  state.commandBusy = true;
  state.error = "";
  mount();

  try {
    const result = await api("/api/actions", {
      method: "POST",
      body: JSON.stringify({ actionId })
    });
    state.session = result.session;
    state.route = result.result.activeRoute;
    state.commander = {
      query: state.commandInput,
      answer: result.result.message,
      activeRoute: result.result.activeRoute,
      relevantPanels: result.result.relevantPanels,
      relatedData: ["Backend action executed successfully."],
      actions: state.session.briefing.suggestedActions,
      source: state.session.briefing.suggestedActionSource,
      evidenceCards: [],
      selectedServiceIds: [],
      toolSource: "action"
    };
  } catch (error) {
    state.error = error.message;
  } finally {
    state.commandBusy = false;
    mount();
  }
}

async function hydrateCommander(query) {
  const result = await api("/api/command", {
    method: "POST",
    body: JSON.stringify({ query })
  });
  state.commandInput = query;
  state.commander = result.command;
  state.route = result.command.activeRoute;
  state.session = result.session;
}

function metricCard(label, value, panelId) {
  return `
    <div class="${panelClass(panelId)}">
      <div class="muted">${label}</div>
      <div class="metric-value">${value}</div>
    </div>
  `;
}

function panelClass(panelId) {
  return highlightClass(panelId) ? "card highlight-card" : "card";
}

function rowClass(panelId) {
  return highlightClass(panelId) ? "highlight-row" : "";
}

function highlightClass(panelId) {
  return state.commander && state.commander.relevantPanels && state.commander.relevantPanels.includes(panelId)
    ? "highlight-card"
    : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

async function bootstrap() {
  try {
    const response = await api("/api/session");
    state.session = response.session;
    if (state.session) {
      await hydrateCommander("hi");
    }
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    mount();
  }
}

bootstrap();
