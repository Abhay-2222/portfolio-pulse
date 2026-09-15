import type { RAG } from "@/lib/data/types";

export function worstRAG(...values: RAG[]): RAG {
  if (values.includes("Red")) return "Red";
  if (values.includes("Amber")) return "Amber";
  if (values.includes("Green")) return "Green";
  return "N/A";
}

export function worstLegLabel(m: {
  OverallRAG: string;
  MarginRAG: string;
  CostRAG: string;
  ScheduleRAG: string;
}): string {
  if (m.OverallRAG === m.MarginRAG) return "margin";
  if (m.OverallRAG === m.CostRAG) return "cost";
  if (m.OverallRAG === m.ScheduleRAG) return "schedule";
  return "none";
}

export function costRAG(
  status: string,
  burnPct: number,
  pctComplete: number,
  amber: number,
  red: number,
): RAG {
  if (status === "Planned") return "N/A";
  const gap = burnPct - pctComplete;
  if (gap > red) return "Red";
  if (gap > amber) return "Amber";
  return "Green";
}

export function scheduleRAG(
  status: string,
  slipDays: number,
  amberDays: number,
  redDays: number,
): RAG {
  if (status === "Planned") return "N/A";
  if (slipDays > redDays) return "Red";
  if (slipDays > amberDays) return "Amber";
  return "Green";
}

export function marginRAG(
  status: string,
  forecastMarginPct: number,
  targetMarginPct: number,
  floor: number,
  tolerance: number,
): RAG {
  if (status === "Planned") return "N/A";
  if (forecastMarginPct < floor) return "Red";
  if (forecastMarginPct < targetMarginPct - tolerance) return "Amber";
  return "Green";
}
