export const CATEGORIES = [
  "bird",
  "mammal",
  "reptile_amphibian",
  "insect",
  "fish",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<Category, { label: string; color: string }> = {
  bird: { label: "Bird", color: "#2f80c0" },
  mammal: { label: "Mammal", color: "#b5651d" },
  reptile_amphibian: { label: "Reptile / Amphibian", color: "#4c9a2a" },
  insect: { label: "Insect", color: "#d4a017" },
  fish: { label: "Fish", color: "#1b9aaa" },
  other: { label: "Other", color: "#7d6b91" },
};

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export function categoryInfo(value: string) {
  return CATEGORY_INFO[isCategory(value) ? value : "other"];
}
