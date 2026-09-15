"use server";

import { revalidatePath } from "next/cache";
import { setGroupingRecipe } from "@/lib/resolver/recipes";
import { clearPortfolioCache } from "@/lib/data/portfolio-service";

export async function confirmGrouping(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id || !projectId) return;
  await setGroupingRecipe(id, projectId, "confirmed");
  clearPortfolioCache();
  revalidatePath("/sources");
}

export async function dismissGrouping(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!id) return;
  await setGroupingRecipe(id, projectId || "none", "dismissed");
  clearPortfolioCache();
  revalidatePath("/sources");
}
