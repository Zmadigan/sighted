import Image from "next/image";
import Link from "next/link";

/** The Sighted mark: a bird perched on an antler, in a dark green tile. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#2c4e2c] shadow-sm ${className}`}>
      <Image src="/logo-mark.png" alt="" width={455} height={512} className="h-[72%] w-auto" preload />
    </span>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-2">
        <span className="text-xl font-extrabold tracking-tight text-forest-800">Sighted</span>
        {/* In the app header on phones there's no room for the tagline next to the icons. */}
        <span className={`text-xs text-bark-500 sm:text-sm ${compact ? "hidden sm:inline" : ""}`}>your wildlife journal</span>
      </span>
    </Link>
  );
}
