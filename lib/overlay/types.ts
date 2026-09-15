import type { EntityRef } from "@/lib/findings/types";

export type OverlayDisposition =
  | "open"
  | "owned"
  | "snoozed"
  | "actioned"
  | "dismissed";

export type SnoozeBreak = "date" | "worsened" | "source";

export type SharedOverlay = {
  disposition: "open" | "owned" | "actioned" | "dismissed";
  owner?: EntityRef;
};

export type PersonalOverlay = {
  snoozeUntil?: string;
  snoozedAmount?: number;
  provenanceFingerprint?: string;
  note?: string;
};

export type OverlayStore = {
  currentUser: string;
  actors: Record<string, EntityRef>;
  shared: Record<string, SharedOverlay>;
  personal: Record<string, Record<string, PersonalOverlay>>;
};

export const SESSION_USER: EntityRef = {
  type: "person",
  id: "helena",
  label: "Helena Marsh",
};

export function emptyOverlayStore(): OverlayStore {
  return {
    currentUser: SESSION_USER.id,
    actors: { [SESSION_USER.id]: SESSION_USER },
    shared: {},
    personal: {},
  };
}
