import { categoryInfo } from "@/lib/categories";

/** The sighting's photo, or a colored tile with the category emoji when there's none. */
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
      style={{ background: `${info.color}22` }}
      role="img"
      aria-label={alt}
    >
      <span className="text-4xl">{info.emoji}</span>
    </div>
  );
}
