"use server";

import { revalidatePath } from "next/cache";
import {
  clearPortfolioCache,
  loadPortfolio,
} from "@/lib/data/portfolio-service";

export async function refreshBriefing() {
  clearPortfolioCache();
  const { refreshActiveRemote } = await import("@/lib/data/user-source");
  await refreshActiveRemote();
  await loadPortfolio(true);
  revalidatePath("/", "layout");
}
