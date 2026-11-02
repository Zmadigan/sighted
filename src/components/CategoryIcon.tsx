import { Bird, Bug, Fish, PawPrint, Rabbit, Turtle, type LucideProps } from "lucide-react";
import { categoryInfo, isCategory, type Category } from "@/lib/categories";

const ICONS: Record<Category, React.ComponentType<LucideProps>> = {
  bird: Bird,
  mammal: Rabbit,
  reptile_amphibian: Turtle,
  insect: Bug,
  fish: Fish,
  other: PawPrint,
};

export function CategoryIcon({ category, ...props }: { category: string } & LucideProps) {
  const Icon = ICONS[isCategory(category) ? category : "other"];
  return <Icon aria-hidden {...props} />;
}

/** Small colored pill: icon + category name. */
export function CategoryBadge({ category }: { category: string }) {
  const info = categoryInfo(category);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white"
      style={{ background: info.color }}
    >
      <CategoryIcon category={category} className="h-3.5 w-3.5" strokeWidth={2.5} />
      {info.label}
    </span>
  );
}
