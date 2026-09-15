import { promises as fs } from "fs";
import path from "path";
import { normalizeHeader } from "@/lib/resolver/bind";

export type RecipeStore = {
  groupings: Record<
    string,
    { projectId: string; status: "confirmed" | "dismissed" }
  >;
  bindings: Record<
    string,
    Record<
      string,
      { canonical: string; table: string; status: "confirmed" | "dismissed" }
    >
  >;
};

export function recipesPath(): string {
  if (process.env.PULSE_USER_DATA_DIR) {
    return path.join(process.env.PULSE_USER_DATA_DIR, "recipes.json");
  }
  return path.join(process.cwd(), "data", "recipes.json");
}

export async function loadRecipes(): Promise<RecipeStore> {
  try {
    const raw = await fs.readFile(recipesPath(), "utf8");
    const parsed = JSON.parse(raw) as RecipeStore;
    return {
      groupings: parsed.groupings ?? {},
      bindings: parsed.bindings ?? {},
    };
  } catch {
    return { groupings: {}, bindings: {} };
  }
}

export async function saveRecipes(store: RecipeStore): Promise<void> {
  await fs.mkdir(path.dirname(recipesPath()), { recursive: true });
  await fs.writeFile(recipesPath(), JSON.stringify(store, null, 2));
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

export async function setBindingRecipe(
  fingerprint: string,
  sourceHeader: string,
  canonical: string,
  table: string,
  status: "confirmed" | "dismissed",
): Promise<RecipeStore> {
  const store = await loadRecipes();
  const key = fingerprint;
  store.bindings[key] = store.bindings[key] ?? {};
  store.bindings[key][normalizeHeader(sourceHeader)] = {
    canonical,
    table,
    status,
  };
  await saveRecipes(store);
  return store;
}
