"use client";

import { BookOpen, Camera, ListChecks, Map, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/identify", label: "Identify", Icon: Camera },
  { href: "/journal", label: "Journal", Icon: BookOpen },
  { href: "/life-list", label: "Life List", Icon: ListChecks },
  { href: "/map", label: "Map", Icon: Map },
  { href: "/friends", label: "Friends", Icon: Users },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

/** Fixed tab bar along the bottom on phones. */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-bold ${
                isActive(tab.href) ? "text-forest-700" : "text-bark-500"
              }`}
            >
              <span
                className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                  isActive(tab.href) ? "bg-forest-100" : ""
                }`}
              >
                <tab.Icon className="h-5 w-5" strokeWidth={isActive(tab.href) ? 2.5 : 2} aria-hidden />
              </span>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Same tabs, shown in the header on larger screens. */
export function TopNav() {
  const isActive = useActive();
  return (
    <nav className="hidden gap-1 md:flex">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            isActive(tab.href) ? "bg-forest-100 text-forest-800" : "text-bark-700 hover:bg-sand-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
