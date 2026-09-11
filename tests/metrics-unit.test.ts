import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarDays,
  networkDays,
  startOfYear,
} from "@/lib/metrics/dates";
import { costRAG, marginRAG, scheduleRAG, worstRAG } from "@/lib/metrics/rag";
import { round1, roundHalfAwayFromZero } from "@/lib/metrics/round";

describe("roundHalfAwayFromZero", () => {
  it("rounds halves away from zero", () => {
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(1.4)).toBe(1);
    expect(round1(1.15)).toBe(1.2);
  });
});

describe("dates", () => {
  it("computes UTC calendar day differences", () => {
    const a = new Date(Date.UTC(2026, 8, 1));
    const b = new Date(Date.UTC(2026, 8, 11));
    expect(calendarDays(a, b)).toBe(10);
    expect(addDays(a, 10).getTime()).toBe(b.getTime());
    expect(startOfYear(b).getUTCMonth()).toBe(0);
    expect(startOfYear(b).getUTCDate()).toBe(1);
  });

  it("counts network days Mon–Fri inclusive", () => {
    // Fri Sep 11 2026 → Mon Sep 14 2026 = 2 weekdays
    const fri = new Date(Date.UTC(2026, 8, 11));
    const mon = new Date(Date.UTC(2026, 8, 14));
    expect(networkDays(fri, mon)).toBe(2);
    expect(networkDays(mon, fri)).toBe(0);
  });
});

describe("RAG", () => {
  it("returns N/A for Planned", () => {
    expect(costRAG("Planned", 1, 0, 0.1, 0.2)).toBe("N/A");
    expect(scheduleRAG("Planned", 100, 14, 30)).toBe("N/A");
    expect(marginRAG("Planned", 0, 0.3, 0.1, 0.05)).toBe("N/A");
  });

  it("classifies cost / schedule / margin and worst", () => {
    expect(costRAG("Active", 0.5, 0.2, 0.1, 0.2)).toBe("Red");
    expect(costRAG("Active", 0.35, 0.2, 0.1, 0.2)).toBe("Amber");
    expect(costRAG("Active", 0.25, 0.2, 0.1, 0.2)).toBe("Green");
    expect(scheduleRAG("Active", 40, 14, 30)).toBe("Red");
    expect(marginRAG("Active", 0.05, 0.3, 0.1, 0.05)).toBe("Red");
    expect(worstRAG("Green", "Amber", "N/A")).toBe("Amber");
    expect(worstRAG("N/A", "N/A")).toBe("N/A");
  });
});
