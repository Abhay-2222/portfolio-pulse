import type { Finding } from "@/lib/findings/types";
import {
  emptyOverlayStore,
  type OverlayStore,
  type SnoozeBreak,
} from "@/lib/overlay/types";
import {
  magnitudeWorsened,
  provenanceFingerprint,
} from "@/lib/overlay/fingerprint";

export function isQueueFinding(f: Finding): boolean {
  const d = f.disposition ?? "open";
  return d === "open" || d === "owned";
}

export function isParkedFinding(f: Finding): boolean {
  return f.disposition === "snoozed";
}

export function isClosedFinding(f: Finding): boolean {
  return f.disposition === "actioned" || f.disposition === "dismissed";
}

function personalOf(store: OverlayStore, findingId: string) {
  return store.personal[store.currentUser]?.[findingId];
}

function snoozeBreak(
  finding: Finding,
  personal: { snoozeUntil?: string; snoozedAmount?: number; provenanceFingerprint?: string },
  now: Date,
): SnoozeBreak | null {
  if (!personal.snoozeUntil) return null;
  if (now.getTime() >= new Date(personal.snoozeUntil).getTime()) return "date";
  if (magnitudeWorsened(finding.amount, personal.snoozedAmount)) return "worsened";
  if (
    personal.provenanceFingerprint &&
    provenanceFingerprint(finding.provenance) !== personal.provenanceFingerprint
  ) {
    return "source";
  }
  return null;
}

export function applyOverlay(
  findings: Finding[],
  store: OverlayStore = emptyOverlayStore(),
  now: Date = new Date(),
): Finding[] {
  return findings.map((f) => {
    const shared = store.shared[f.id];
    const personal = personalOf(store, f.id);
    const broke = personal ? snoozeBreak(f, personal, now) : null;
    const snoozeActive = Boolean(personal?.snoozeUntil) && !broke;

    let disposition: Finding["disposition"] = shared?.disposition ?? "open";
    if (snoozeActive) disposition = "snoozed";
    else if (!shared && f.disposition) disposition = f.disposition;

    return {
      ...f,
      disposition,
      owner: shared?.owner ?? f.owner,
      snoozeUntil: snoozeActive ? personal?.snoozeUntil : undefined,
      note: personal?.note ?? f.note,
      snoozeBroke: broke ?? undefined,
    };
  });
}

export function queueFindings(findings: Finding[]): Finding[] {
  return findings.filter(isQueueFinding);
}
