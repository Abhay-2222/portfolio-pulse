import { promises as fs } from "fs";
import path from "path";

export type RecipeStore = {
  groupings: Record<string, { projectId: string; status: "confirmed" | "dismissed" }>;
};

const EMPTY: RecipeStore = { groupings: {} };

export function recipesPath(): string {
  return path.join(process.cwd(), "data", "recipes.json");
}

export async function loadRecipes(): Promise<RecipeStore> {
  try {
    const raw = await fs.readFile(recipesPath(), "utf8");
    return JSON.parse(raw) as RecipeStore;
  } catch {
    return EMPTY;
  }
}

export async function saveRecipes(store: RecipeStore): Promise<void> {
  await fs.mkdir(path.dirname(recipesPath()), { recursive: true });
  await fs.writeFile(recipesPath(), JSON.stringify(store, null, 2), "utf8");
}

export async function setGroupingRecipe(
  id: string,
  projectId: string,
  status: "confirmed" | "dismissed",
): Promise<RecipeStore> {
  const store = await loadRecipes();
  store.groupings[id] = { projectId, status };
  await saveRecipes(store);
  return store;
}
