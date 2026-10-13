"use server";

import { revalidatePath } from "next/cache";

export async function refreshBriefing() {
  revalidatePath("/", "layout");
}
