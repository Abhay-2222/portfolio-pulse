import { EntityCard, ragTone } from "@/components/ui/ListCard";
import type { ProjectSummary } from "@/lib/pmo/types";

function figureFor(p: ProjectSummary): string {
  if (p.calculatedRag) return p.calculatedRag;
  if (p.healthCheck === "No status reported") return "No status";
  return "n/a";
}

export function ProjectRow({ project }: { project: ProjectSummary }) {
  const tone =
    project.healthCheck === "Reported better than data"
      ? "watch"
      : ragTone(project.calculatedRag ?? undefined);
  const bits = [
    project.code,
    project.healthReason,
    project.isStale ? "Stale" : null,
    project.newThisWeek ? "New this week" : null,
  ].filter(Boolean);
  return (
    <EntityCard
      href={`/projects/${project.code}`}
      kicker={project.programName}
      title={project.name}
      meta={bits.join(" · ")}
      rag={project.calculatedRag ?? "N/A"}
      tone={tone}
      figure={figureFor(project)}
      figureLabel="Calculated"
      figureTone={project.calculatedRag === "Red" ? "bad" : "neutral"}
    />
  );
}
