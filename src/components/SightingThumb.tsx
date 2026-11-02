import { categoryInfo } from "@/lib/categories";
import { CategoryIcon } from "./CategoryIcon";

/** The sighting's photo, or a colored tile with the category icon when there's none. */
export function SightingThumb({
  src,
  category,
  alt,
  className = "",
}: {
  src: string | null;
  category: string;
  alt: string;
  className?: string;
}) {
  const info = categoryInfo(category);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: `${info.color}1f`, color: info.color }}
      role="img"
      aria-label={alt}
    >
      <CategoryIcon category={category} className="h-10 w-10" strokeWidth={1.75} />
    </div>
  );
}
