import type { Dataset, RaidItem, RiskSeverity } from "@/lib/data/types";

export interface RaidMetrics {
  RAIDID: string;
  RiskScore: number;
  Severity: RiskSeverity;
  ExpectedExposure: number;
}

export function computeRaidMetrics(
  item: RaidItem,
  dataset: Dataset,
): RaidMetrics {
  const RiskScore = item.Probability * item.Impact;
  const { RiskCriticalScore, RiskHighScore, RiskMediumScore } = dataset.settings;
  let Severity: RiskSeverity;
  if (RiskScore >= RiskCriticalScore) Severity = "Critical";
  else if (RiskScore >= RiskHighScore) Severity = "High";
  else if (RiskScore >= RiskMediumScore) Severity = "Medium";
  else Severity = "Low";
  const ExpectedExposure = (item.CostExposure * item.Probability) / 5;
  return { RAIDID: item.RAIDID, RiskScore, Severity, ExpectedExposure };
}
