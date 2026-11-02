import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-2">
      <span className="text-2xl font-extrabold tracking-tight text-forest-700">
        <span aria-hidden>🌿</span> Sighted
      </span>
      <span className="text-xs text-bark-500 sm:text-sm">your wildlife journal</span>
    </Link>
  );
}
