import { describe, expect, it } from "vitest";
import {
  getBriefing,
  getMe,
  getMoney,
  getPortfolio,
  getProject,
  getStatus,
  listProjects,
} from "@/lib/pmo/queries";

const ADMIN = "USR001";
const VIEWER = "USR028";
const PM_SCOPED = "USR012";

describe("PMO contract", () => {
  it("watermelon PRJ-069 is reported better than data", () => {
    const p = getProject(ADMIN, "PRJ-069", true);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.reportedRag).toBe("Green");
    expect(p.calculatedRag).toBe("Red");
    expect(p.healthCheck).toBe("Reported better than data");
    expect(p.healthReason).toMatch(/110 days late/i);
  });

  it("newly red PRJ-043 is in the newlyRed briefing group", () => {
    const p = getProject(ADMIN, "PRJ-043", true);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.calculatedRag).toBe("Red");
    expect(p.newThisWeek).toBe(true);
    const briefing = getBriefing(ADMIN);
    const group = briefing.groups.find((g) => g.key === "newlyRed");
    expect(group?.items.some((i) => i.code === "PRJ-043")).toBe(true);
  });

  it("stale Green is stale, not current", () => {
    const p = getProject(ADMIN, "PRJ-039", true);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.calculatedRag).toBe("Green");
    expect(p.isStale).toBe(true);
  });

  it("missing RAG is No status reported", () => {
    const p = getProject(ADMIN, "PRJ-133", true);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.reportedRag).toBeNull();
    expect(p.healthCheck).toBe("No status reported");
  });

  it("rebaseline shows version and slip vs original", () => {
    const p = getProject(ADMIN, "PRJ-049", true);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.dates.baselineVersion).toBeGreaterThan(1);
    expect(p.dates.slipVsOriginalDays).toBeGreaterThan(0);
  });

  it("issue-only Red names the critical issue", () => {
    const p = getProject(ADMIN, "PRJ-070", true);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.calculatedRag).toBe("Red");
    expect(p.healthReason?.toLowerCase()).toMatch(/critical/);
  });

  it("viewer without financials omits money", () => {
    const me = getMe(VIEWER)!;
    expect(me.canViewFinancials).toBe(false);
    const p = getProject(VIEWER, "PRJ-008", me.canViewFinancials);
    expect(p).not.toBe("not_found");
    if (p === "not_found") return;
    expect(p.money).toBeUndefined();
  });

  it("scoped user 404s on out-of-scope codes", () => {
    expect(getProject(PM_SCOPED, "PRJ-069", true)).toBe("not_found");
    expect(getProject(PM_SCOPED, "PRJ-043", true)).not.toBe("not_found");
  });

  it("home folders do not treat watermelons as calm green", () => {
    const home = getPortfolio(ADMIN);
    const withMelon = home.programs.find((p) => p.counts.reportedBetterThanData > 0);
    expect(withMelon).toBeTruthy();
    if (!withMelon) return;
    const calmGreen =
      withMelon.counts.red === 0 &&
      withMelon.counts.amber === 0 &&
      withMelon.counts.reportedBetterThanData > 0;
    expect(calmGreen).toBe(false);
  });

  it("status as-of is the last successful load", () => {
    const status = getStatus();
    expect(status.asOf).toBe("2026-10-09");
    expect(status.lastSuccessfulLoad.status).toBe("Succeeded");
  });

  it("admin money lists programs", () => {
    const rows = getMoney(ADMIN);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.currency === "CAD")).toBe(true);
  });

  it("listProjects severity sort puts Red first", () => {
    const { items } = listProjects(ADMIN, { sort: "severity", limit: 20 });
    const firstRed = items.findIndex((i) => i.calculatedRag === "Red");
    const firstGreen = items.findIndex((i) => i.calculatedRag === "Green");
    if (firstRed >= 0 && firstGreen >= 0) {
      expect(firstRed).toBeLessThan(firstGreen);
    }
  });
});
