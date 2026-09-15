"use server";

import { revalidatePath } from "next/cache";
import { patchOverlay } from "@/lib/overlay/store";
import { SESSION_USER } from "@/lib/overlay/types";

function refresh() {
  revalidatePath("/", "layout");
}

function findingId(formData: FormData): string {
  return String(formData.get("id") ?? "");
}

export async function ownFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  await patchOverlay({
    findingId: id,
    shared: { disposition: "owned", owner: SESSION_USER },
  });
  refresh();
}

export async function releaseFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  await patchOverlay({
    findingId: id,
    shared: { disposition: "open", owner: undefined },
  });
  refresh();
}

export async function snoozeFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  const days = Math.max(1, Number(formData.get("days") ?? 7) || 7);
  const amountRaw = formData.get("amount");
  const amount =
    amountRaw === null || amountRaw === ""
      ? undefined
      : Number(amountRaw);
  const fingerprint = String(formData.get("fingerprint") ?? "");
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  await patchOverlay({
    findingId: id,
    personal: {
      snoozeUntil: until.toISOString(),
      snoozedAmount: Number.isFinite(amount) ? amount : undefined,
      provenanceFingerprint: fingerprint || undefined,
    },
  });
  refresh();
}

export async function unsnoozeFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  await patchOverlay({ findingId: id, clearSnooze: true });
  refresh();
}

export async function noteFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  const note = String(formData.get("note") ?? "").trim();
  await patchOverlay({
    findingId: id,
    personal: { note: note || undefined },
  });
  refresh();
}

export async function actionFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  await patchOverlay({
    findingId: id,
    shared: { disposition: "actioned" },
    clearSnooze: true,
  });
  refresh();
}

export async function dismissFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  await patchOverlay({
    findingId: id,
    shared: { disposition: "dismissed" },
    clearSnooze: true,
  });
  refresh();
}

export async function reopenFinding(formData: FormData) {
  const id = findingId(formData);
  if (!id) return;
  const hadOwner = String(formData.get("hadOwner") ?? "") === "1";
  await patchOverlay({
    findingId: id,
    shared: { disposition: hadOwner ? "owned" : "open" },
    clearSnooze: true,
  });
  refresh();
}
