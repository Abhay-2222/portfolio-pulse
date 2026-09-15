import { promises as fs } from "fs";
import path from "path";
import {
  emptyOverlayStore,
  SESSION_USER,
  type OverlayStore,
  type PersonalOverlay,
  type SharedOverlay,
} from "@/lib/overlay/types";

export function overlayPath(): string {
  return path.join(process.cwd(), "data", "overlay.json");
}

export async function loadOverlay(): Promise<OverlayStore> {
  try {
    const raw = await fs.readFile(overlayPath(), "utf8");
    const parsed = JSON.parse(raw) as OverlayStore;
    return {
      ...emptyOverlayStore(),
      ...parsed,
      actors: { [SESSION_USER.id]: SESSION_USER, ...parsed.actors },
      shared: parsed.shared ?? {},
      personal: parsed.personal ?? {},
      currentUser: parsed.currentUser || SESSION_USER.id,
    };
  } catch {
    return emptyOverlayStore();
  }
}

export async function saveOverlay(store: OverlayStore): Promise<void> {
  await fs.mkdir(path.dirname(overlayPath()), { recursive: true });
  await fs.writeFile(overlayPath(), JSON.stringify(store, null, 2));
}

export async function patchOverlay(input: {
  findingId: string;
  shared?: Partial<SharedOverlay> | null;
  personal?: Partial<PersonalOverlay> | null;
  clearSnooze?: boolean;
}): Promise<OverlayStore> {
  const store = await loadOverlay();
  const id = input.findingId;
  if (input.shared === null) {
    delete store.shared[id];
  } else if (input.shared) {
    const prev = store.shared[id];
    const next: SharedOverlay = {
      disposition:
        input.shared.disposition ?? prev?.disposition ?? "open",
    };
    if ("owner" in input.shared) {
      if (input.shared.owner) next.owner = input.shared.owner;
    } else if (prev?.owner) {
      next.owner = prev.owner;
    }
    store.shared[id] = next;
  }
  const bag = store.personal[store.currentUser] ?? {};
  if (input.personal === null) {
    delete bag[id];
  } else if (input.personal || input.clearSnooze) {
    const next: PersonalOverlay = { ...bag[id], ...input.personal };
    if (input.clearSnooze) {
      delete next.snoozeUntil;
      delete next.snoozedAmount;
      delete next.provenanceFingerprint;
    }
    bag[id] = next;
  }
  store.personal[store.currentUser] = bag;
  await saveOverlay(store);
  return store;
}
