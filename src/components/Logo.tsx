import { Leaf } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-600 text-white shadow-sm">
        <Leaf className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-2">
        <span className="text-xl font-extrabold tracking-tight text-forest-800">Sighted</span>
        <span className="text-xs text-bark-500 sm:text-sm">your wildlife journal</span>
      </span>
    </Link>
  );
}
