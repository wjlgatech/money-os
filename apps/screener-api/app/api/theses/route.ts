import { NextRequest } from "next/server";
import { validateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

// ── Types ───────────────────────────────────────────────────────

interface ThesisClaim {
  id: number;
  claim: string;
  ticker: string;
  scores: {
    testability: number;
    mechanism: number;
    falsifiability: number;
    timing: number;
    total: number;
  };
  action: "VERIFY" | "MONITOR" | "HEDGE" | "REJECT";
  sizeMultiplier: number;
  verdict?: {
    recommendation: string;
    confidence: number;
    source: string;
  };
}

interface ThesisRecord {
  id: string;
  name: string;
  source: string;
  coreClaim: string;
  grade: string;
  qualityScore: number;
  sourceModifier: number;
  adjustedScore: number;
  killAssumption: string;
  claims: ThesisClaim[];
  status: "analyzing" | "scored" | "debated" | "traded" | "monitoring" | "closed";
  createdAt: string;
  updatedAt: string;
  tradeIds?: string[];
  reviewDate?: string;
  notes?: string;
}

interface ThesesStore {
  theses: ThesisRecord[];
}

// ── Persistence ─────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), "data", "theses.json");

async function loadStore(): Promise<ThesesStore> {
  try {
    const json = await readFile(STORE_PATH, "utf8");
    return JSON.parse(json);
  } catch {
    return { theses: [] };
  }
}

async function saveStore(store: ThesesStore) {
  const dir = path.dirname(STORE_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

// ── GET — List all theses, or get one by ?id= ──────────────────

export async function GET(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const store = await loadStore();
  const id = req.nextUrl.searchParams.get("id");
  const status = req.nextUrl.searchParams.get("status");

  if (id) {
    const thesis = store.theses.find((t) => t.id === id);
    if (!thesis) return apiError("Thesis not found", 404);
    return apiSuccess({ thesis });
  }

  let results = store.theses;
  if (status) {
    results = results.filter((t) => t.status === status);
  }

  // Sort by most recent first
  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return apiSuccess({
    theses: results,
    total: results.length,
    statuses: {
      analyzing: results.filter((t) => t.status === "analyzing").length,
      scored: results.filter((t) => t.status === "scored").length,
      debated: results.filter((t) => t.status === "debated").length,
      traded: results.filter((t) => t.status === "traded").length,
      monitoring: results.filter((t) => t.status === "monitoring").length,
      closed: results.filter((t) => t.status === "closed").length,
    },
  });
}

// ── POST — Create or update a thesis ────────────────────────────

export async function POST(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action } = body;
    const store = await loadStore();

    // ── Create new thesis ────────────────────────────────────
    if (action === "create") {
      const { name, source, coreClaim, claims } = body;
      if (!name || !coreClaim) {
        return apiError("name and coreClaim are required", 400);
      }

      const thesis: ThesisRecord = {
        id: crypto.randomUUID(),
        name,
        source: source || "unknown",
        coreClaim,
        grade: "",
        qualityScore: 0,
        sourceModifier: 0,
        adjustedScore: 0,
        killAssumption: "",
        claims: claims || [],
        status: "analyzing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.theses.push(thesis);
      await saveStore(store);
      return apiSuccess({ thesis, message: "Thesis created" }, 201);
    }

    // ── Score thesis (after quality analysis) ────────────────
    if (action === "score") {
      const { id, grade, qualityScore, sourceModifier, adjustedScore, killAssumption, claims } = body;
      const thesis = store.theses.find((t) => t.id === id);
      if (!thesis) return apiError("Thesis not found", 404);

      thesis.grade = grade;
      thesis.qualityScore = qualityScore;
      thesis.sourceModifier = sourceModifier ?? 0;
      thesis.adjustedScore = adjustedScore ?? qualityScore;
      thesis.killAssumption = killAssumption || "";
      if (claims) thesis.claims = claims;
      thesis.status = "scored";
      thesis.updatedAt = new Date().toISOString();

      await saveStore(store);
      return apiSuccess({ thesis, message: "Thesis scored" });
    }

    // ── Add analyst verdicts (after TA debate) ───────────────
    if (action === "add_verdicts") {
      const { id, verdicts } = body;
      const thesis = store.theses.find((t) => t.id === id);
      if (!thesis) return apiError("Thesis not found", 404);

      for (const v of verdicts || []) {
        const claim = thesis.claims.find((c) => c.ticker === v.ticker);
        if (claim) {
          claim.verdict = {
            recommendation: v.verdict,
            confidence: v.confidence,
            source: v.source,
          };
        }
      }

      thesis.status = "debated";
      thesis.updatedAt = new Date().toISOString();

      await saveStore(store);
      return apiSuccess({ thesis, message: "Verdicts added" });
    }

    // ── Mark as traded (after human approval + execution) ────
    if (action === "mark_traded") {
      const { id, tradeIds, reviewDate } = body;
      const thesis = store.theses.find((t) => t.id === id);
      if (!thesis) return apiError("Thesis not found", 404);

      thesis.status = "traded";
      thesis.tradeIds = tradeIds || [];
      thesis.reviewDate = reviewDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      thesis.updatedAt = new Date().toISOString();

      await saveStore(store);
      return apiSuccess({ thesis, message: `Thesis marked as traded. Review on ${thesis.reviewDate}` });
    }

    // ── Close thesis (expired, invalidated, or all positions exited) ──
    if (action === "close") {
      const { id, notes } = body;
      const thesis = store.theses.find((t) => t.id === id);
      if (!thesis) return apiError("Thesis not found", 404);

      thesis.status = "closed";
      thesis.notes = notes || "";
      thesis.updatedAt = new Date().toISOString();

      await saveStore(store);
      return apiSuccess({ thesis, message: "Thesis closed" });
    }

    // ── Add notes ────────────────────────────────────────────
    if (action === "note") {
      const { id, notes } = body;
      const thesis = store.theses.find((t) => t.id === id);
      if (!thesis) return apiError("Thesis not found", 404);

      thesis.notes = (thesis.notes ? thesis.notes + "\n" : "") + `[${new Date().toISOString().slice(0, 10)}] ${notes}`;
      thesis.updatedAt = new Date().toISOString();

      await saveStore(store);
      return apiSuccess({ thesis, message: "Note added" });
    }

    return apiError("Unknown action. Use: create, score, add_verdicts, mark_traded, close, note", 400);
  } catch (err) {
    return apiError(`Thesis operation failed: ${err}`, 500);
  }
}

// ── DELETE — Remove a thesis ────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const authErr = validateRequest(req);
  if (authErr) return authErr;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("id parameter required", 400);

  const store = await loadStore();
  const idx = store.theses.findIndex((t) => t.id === id);
  if (idx === -1) return apiError("Thesis not found", 404);

  const removed = store.theses.splice(idx, 1)[0];
  await saveStore(store);

  return apiSuccess({ removed: removed.name, message: "Thesis deleted" });
}
