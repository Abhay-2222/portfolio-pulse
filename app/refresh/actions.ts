"use server";

import { revalidatePath } from "next/cache";
import {
  clearPortfolioCache,
  loadPortfolio,
} from "@/lib/data/portfolio-service";

export async function refreshBriefing() {
  clearPortfolioCache();
  await loadPortfolio(true);
  revalidatePath("/", "layout");
}
