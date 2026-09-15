import { loadPortfolio } from "@/lib/data/portfolio-service";
import { PulseHome } from "@/components/pulse/PulseHome";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let error: string | null = null;
  let payload: Awaited<ReturnType<typeof loadPortfolio>> | null = null;
  try {
    payload = await loadPortfolio(true);
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't load portfolio data";
  }

  if (error || !payload) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-[34px] font-normal leading-[41px] tracking-tight">
          Portfolio Pulse
        </h1>
        <p className="mt-3 text-[17px] text-[var(--ink-2)]">
          Couldn&apos;t read the workbook. Upload a matching .xlsx on Book,
          or check DATA_FILE_PATH.
        </p>
        <pre className="mt-6 overflow-auto rounded-[14px] bg-[var(--surface)] p-4 text-[13px] text-[var(--off-track-text)]">
          {error}
        </pre>
      </main>
    );
  }

  return <PulseHome payload={payload} />;
}
