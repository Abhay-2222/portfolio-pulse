export function probabilityLabel(n: number): string {
  return (
    ["", "Rare", "Unlikely", "Likely", "Very likely", "Almost certain"][n] ??
    String(n)
  );
}

export function impactLabel(n: number): string {
  return (
    ["", "Negligible", "Minor", "Moderate", "Major", "Severe"][n] ?? String(n)
  );
}

export function pxILine(probability: number, impact: number): string {
  return `${probabilityLabel(probability)} (${probability}/5) × ${impactLabel(impact)} (${impact}/5) = ${probability * impact}`;
}

export function severityToRag(
  severity: string,
): "Red" | "Amber" | "Green" | "N/A" {
  if (severity === "Critical" || severity === "High" || severity === "Overdue") {
    return "Red";
  }
  if (
    severity === "Medium" ||
    severity === "Outstanding" ||
    severity === "At Risk" ||
    severity === "Watch"
  ) {
    return "Amber";
  }
  if (
    severity === "Low" ||
    severity === "On Track" ||
    severity === "On track" ||
    severity === "Paid" ||
    severity === "Completed"
  ) {
    return "Green";
  }
  if (
    severity === "Red" ||
    severity === "Amber" ||
    severity === "Green" ||
    severity === "N/A"
  ) {
    return severity;
  }
  return "N/A";
}

export function severityLabel(kind: string): string {
  if (kind === "Red") return "Off track";
  if (kind === "Amber") return "Watch";
  if (kind === "Green") return "On track";
  if (kind === "N/A") return "Not started";
  return kind;
}
