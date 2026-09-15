import { describe, expect, it } from "vitest";
import type { Finding } from "@/lib/findings/types";
import {
  applyOverlay,
  isQueueFinding,
  queueFindings,
} from "@/lib/overlay/apply";
import { magnitudeWorsened, provenanceFingerprint } from "@/lib/overlay/fingerprint";
import { emptyOverlayStore, SESSION_USER } from "@/lib/overlay/types";
import { exportFindingMarkdown } from "@/lib/overlay/export";

function finding(partial: Partial<Finding> = {}): Finding {
  return {
    id: "money.milestone_passed_unbilled:MS-9",
    ruleId: "money.milestone_passed_unbilled",
    subject: { type: "milestone", id: "MS-9", label: "Build complete" },
    related: [{ type: "project", id: "P-1002", label: "Claims Automation Engine" }],
    domain: "money",
    kind: "exception",
    amount: 231_000,
    severity: 4,
    treatment: 4,
    headline: "$231k is billable now and has not been invoiced.",
    sentence: "The Build complete milestone on Claims Automation Engine passed.",
    section: "escalation",
    href: "/projects/P-1002",
    provenance: [
      {
        fileId: "Enterprise_Portfolio_Data.xlsx",
        sheet: "Milestones",
        column: "BillingPct",
        cell: "Milestones!I9",
      },
    ],
    asOf: "2026-09-11T00:00:00.000Z",
    staleness: 0,
    confidence: "high",
    ...partial,
  };
}

describe("overlay merge and snooze breaks", () => {
  it("applies shared owner and disposition", () => {
    const store = emptyOverlayStore();
    store.shared[finding().id] = {
      disposition: "owned",
      owner: SESSION_USER,
    };
    const [hit] = applyOverlay([finding()], store);
    expect(hit?.disposition).toBe("owned");
    expect(hit?.owner?.label).toBe("Helena Marsh");
    expect(isQueueFinding(hit!)).toBe(true);
  });

  it("hides a live snooze from the Pulse queue", () => {
    const store = emptyOverlayStore();
    const f = finding();
    store.personal[store.currentUser] = {
      [f.id]: {
        snoozeUntil: "2099-01-01T00:00:00.000Z",
        snoozedAmount: f.amount,
        provenanceFingerprint: provenanceFingerprint(f.provenance),
      },
    };
    const out = applyOverlay([f], store, new Date("2026-09-14T00:00:00Z"));
    expect(out[0]?.disposition).toBe("snoozed");
    expect(queueFindings(out)).toHaveLength(0);
  });

  it("returns a snooze when the date passes", () => {
    const store = emptyOverlayStore();
    const f = finding();
    store.personal[store.currentUser] = {
      [f.id]: { snoozeUntil: "2026-09-10T00:00:00.000Z", snoozedAmount: 231_000 },
    };
    const [hit] = applyOverlay([f], store, new Date("2026-09-14T00:00:00Z"));
    expect(hit?.disposition).toBe("open");
    expect(hit?.snoozeBroke).toBe("date");
    expect(isQueueFinding(hit!)).toBe(true);
  });

  it("returns a snooze when magnitude worsens 20%", () => {
    const store = emptyOverlayStore();
    const f = finding({ amount: 300_000 });
    store.personal[store.currentUser] = {
      [f.id]: {
        snoozeUntil: "2099-01-01T00:00:00.000Z",
        snoozedAmount: 231_000,
        provenanceFingerprint: provenanceFingerprint(f.provenance),
      },
    };
    const [hit] = applyOverlay([f], store, new Date("2026-09-14T00:00:00Z"));
    expect(hit?.snoozeBroke).toBe("worsened");
    expect(hit?.disposition).toBe("open");
  });

  it("returns a snooze when source cells change", () => {
    const store = emptyOverlayStore();
    const f = finding();
    store.personal[store.currentUser] = {
      [f.id]: {
        snoozeUntil: "2099-01-01T00:00:00.000Z",
        snoozedAmount: 231_000,
        provenanceFingerprint: "old-cells",
      },
    };
    const [hit] = applyOverlay([f], store, new Date("2026-09-14T00:00:00Z"));
    expect(hit?.snoozeBroke).toBe("source");
  });

  it("keeps dismissed findings out of the queue", () => {
    const store = emptyOverlayStore();
    const f = finding();
    store.shared[f.id] = { disposition: "dismissed" };
    const out = applyOverlay([f], store);
    expect(queueFindings(out)).toHaveLength(0);
    expect(out[0]?.disposition).toBe("dismissed");
  });

  it("exports note and owner in markdown", () => {
    const f = finding({
      disposition: "owned",
      owner: SESSION_USER,
      note: "Invoice this week.",
    });
    const md = exportFindingMarkdown(f);
    expect(md).toContain("Helena Marsh");
    expect(md).toContain("Invoice this week.");
    expect(md).toContain("Milestones!I9");
  });

  it("treats a 20% magnitude move as worsened", () => {
    expect(magnitudeWorsened(120, 100)).toBe(true);
    expect(magnitudeWorsened(110, 100)).toBe(false);
    expect(magnitudeWorsened(-14, -10)).toBe(true);
  });
});
