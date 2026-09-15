export type {
  OverlayDisposition,
  OverlayStore,
  PersonalOverlay,
  SharedOverlay,
  SnoozeBreak,
} from "@/lib/overlay/types";
export { SESSION_USER, emptyOverlayStore } from "@/lib/overlay/types";
export {
  applyOverlay,
  isClosedFinding,
  isParkedFinding,
  isQueueFinding,
  queueFindings,
} from "@/lib/overlay/apply";
export { provenanceFingerprint, magnitudeWorsened } from "@/lib/overlay/fingerprint";
export { loadOverlay, patchOverlay, overlayPath } from "@/lib/overlay/store";
export { exportFindingMarkdown, exportQueueMarkdown } from "@/lib/overlay/export";
