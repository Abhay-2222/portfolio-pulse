import { loadPortfolio } from "@/lib/data/portfolio-service";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  let payload: Awaited<ReturnType<typeof loadPortfolio>> | null = null;
  let error: string | null = null;
  try {
    payload = await loadPortfolio(true);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load portfolio";
  }

  return (
    <main style={{ fontFamily: "ui-monospace, monospace", padding: 24 }}>
      <h1>Portfolio Pulse — Phase 1 debug</h1>
      <p>Raw JSON from the data foundation. UI ships in later phases.</p>
      {error ? (
        <pre style={{ color: "crimson" }}>{error}</pre>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(
            {
              version: payload?.version,
              fetchedAt: payload?.fetchedAt,
              asOfDate: payload?.asOfDate,
              issueCount: payload?.issues.length,
              portfolio: payload?.metrics.portfolio,
              projectCount: payload?.dataset.projects.length,
              sampleProject: payload?.metrics.projects.find(
                (p) => p.ProjectID === "P-1017",
              ),
            },
            null,
            2,
          )}
        </pre>
      )}
      <p>
        Full payload: <a href="/api/portfolio">/api/portfolio</a> · force
        refresh: <a href="/api/portfolio?force=1">?force=1</a>
      </p>
    </main>
  );
}
