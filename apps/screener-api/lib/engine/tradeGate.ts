/**
 * Trade Gate — Human Approval Pipeline
 *
 * The machine proposes trades. The human approves/rejects.
 * Only approved trades get executed. Full audit trail.
 *
 * Flow:
 * 1. Auto-trader generates proposals → saved to pending queue
 * 2. Human reviews via API/Claude → approves or rejects each
 * 3. Approved trades execute immediately (paper or live)
 * 4. All decisions logged for learning
 */

import { type TradeProposal } from "./paperTrader";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const GATE_PATH = path.join(process.cwd(), "data", "trade-gate.json");

export interface GateState {
  pendingProposals: TradeProposal[];
  approvedHistory: Array<TradeProposal & { approvedAt: string }>;
  rejectedHistory: Array<TradeProposal & { rejectedAt: string; reason: string }>;
  executedHistory: Array<TradeProposal & { executedAt: string; actualPrice: number }>;
  rules: GateRules;
}

export interface GateRules {
  /** Auto-approve trades below this dollar amount */
  autoApproveBelow: number;
  /** Auto-approve if confidence is this level or higher */
  autoApproveConfidence: "low" | "medium" | "high" | "none";
  /** Max total exposure as % of portfolio */
  maxExposurePct: number;
  /** Max single position as % of portfolio */
  maxPositionPct: number;
  /** Max daily trades */
  maxDailyTrades: number;
  /** Require confirmation for sells */
  confirmSells: boolean;
}

const DEFAULT_RULES: GateRules = {
  autoApproveBelow: 0,            // nothing auto-approved by default
  autoApproveConfidence: "none",  // nothing auto-approved by default
  maxExposurePct: 30,             // max 30% of portfolio in positions
  maxPositionPct: 5,              // max 5% per position
  maxDailyTrades: 5,
  confirmSells: true,
};

export class TradeGate {
  private state: GateState;

  constructor(state?: GateState) {
    this.state = state ?? {
      pendingProposals: [],
      approvedHistory: [],
      rejectedHistory: [],
      executedHistory: [],
      rules: { ...DEFAULT_RULES },
    };
  }

  // ── Submit Proposals ─────────────────────────────────────

  submit(proposals: TradeProposal[]): {
    autoApproved: TradeProposal[];
    pendingReview: TradeProposal[];
    rejected: Array<TradeProposal & { reason: string }>;
  } {
    const autoApproved: TradeProposal[] = [];
    const pendingReview: TradeProposal[] = [];
    const rejected: Array<TradeProposal & { reason: string }> = [];

    const todayTrades = this.state.executedHistory.filter(
      (t) => t.executedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
    ).length;

    for (const proposal of proposals) {
      // Check daily trade limit
      if (todayTrades + autoApproved.length >= this.state.rules.maxDailyTrades) {
        rejected.push({ ...proposal, reason: "Daily trade limit reached" });
        continue;
      }

      // Check position size limit
      if (proposal.riskPct > this.state.rules.maxPositionPct) {
        rejected.push({ ...proposal, reason: `Position risk ${proposal.riskPct}% exceeds ${this.state.rules.maxPositionPct}% limit` });
        continue;
      }

      // Check auto-approval rules
      const costEstimate = proposal.shares * proposal.estimatedPrice;
      const confOrder = { none: 0, low: 1, medium: 2, high: 3 };

      if (
        costEstimate <= this.state.rules.autoApproveBelow ||
        confOrder[proposal.confidence] >= confOrder[this.state.rules.autoApproveConfidence]
      ) {
        proposal.status = "approved";
        autoApproved.push(proposal);
        this.state.approvedHistory.push({
          ...proposal,
          approvedAt: new Date().toISOString(),
        });
      } else {
        proposal.status = "pending";
        pendingReview.push(proposal);
        this.state.pendingProposals.push(proposal);
      }
    }

    for (const r of rejected) {
      this.state.rejectedHistory.push({
        ...r,
        rejectedAt: new Date().toISOString(),
      });
    }

    return { autoApproved, pendingReview, rejected };
  }

  // ── Human Actions ────────────────────────────────────────

  approve(proposalId: string): TradeProposal | null {
    const idx = this.state.pendingProposals.findIndex((p) => p.id === proposalId);
    if (idx === -1) return null;

    const proposal = this.state.pendingProposals.splice(idx, 1)[0];
    proposal.status = "approved";
    this.state.approvedHistory.push({
      ...proposal,
      approvedAt: new Date().toISOString(),
    });
    return proposal;
  }

  reject(proposalId: string, reason: string): TradeProposal | null {
    const idx = this.state.pendingProposals.findIndex((p) => p.id === proposalId);
    if (idx === -1) return null;

    const proposal = this.state.pendingProposals.splice(idx, 1)[0];
    proposal.status = "rejected";
    this.state.rejectedHistory.push({
      ...proposal,
      rejectedAt: new Date().toISOString(),
      reason,
    });
    return proposal;
  }

  approveAll(): TradeProposal[] {
    const approved = [];
    for (const p of this.state.pendingProposals) {
      p.status = "approved";
      this.state.approvedHistory.push({
        ...p,
        approvedAt: new Date().toISOString(),
      });
      approved.push(p);
    }
    this.state.pendingProposals = [];
    return approved;
  }

  rejectAll(reason: string): TradeProposal[] {
    const rejected = [];
    for (const p of this.state.pendingProposals) {
      p.status = "rejected";
      this.state.rejectedHistory.push({
        ...p,
        rejectedAt: new Date().toISOString(),
        reason,
      });
      rejected.push(p);
    }
    this.state.pendingProposals = [];
    return rejected;
  }

  markExecuted(proposalId: string, actualPrice: number) {
    const inApproved = this.state.approvedHistory.find((p) => p.id === proposalId);
    if (inApproved) {
      this.state.executedHistory.push({
        ...inApproved,
        executedAt: new Date().toISOString(),
        actualPrice,
      });
    }
  }

  // ── State ────────────────────────────────────────────────

  getPending(): TradeProposal[] {
    return [...this.state.pendingProposals];
  }

  getRules(): GateRules {
    return { ...this.state.rules };
  }

  updateRules(rules: Partial<GateRules>) {
    this.state.rules = { ...this.state.rules, ...rules };
  }

  getStats() {
    return {
      pending: this.state.pendingProposals.length,
      approved: this.state.approvedHistory.length,
      rejected: this.state.rejectedHistory.length,
      executed: this.state.executedHistory.length,
    };
  }

  // ── Persistence ──────────────────────────────────────────

  toJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  static fromJSON(json: string): TradeGate {
    return new TradeGate(JSON.parse(json));
  }

  async save() {
    const dir = path.dirname(GATE_PATH);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(GATE_PATH, this.toJSON());
  }

  static async load(): Promise<TradeGate> {
    try {
      const json = await readFile(GATE_PATH, "utf8");
      return TradeGate.fromJSON(json);
    } catch {
      return new TradeGate();
    }
  }
}
