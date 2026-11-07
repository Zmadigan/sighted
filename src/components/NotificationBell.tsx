"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** Bell in the header with the number of unread notifications. */
export function NotificationBell({ unread }: { unread: number }) {
  const pathname = usePathname();
  const onPage = pathname === "/notifications";
  // Opening the page reads them all. The header isn't reloaded on every tap, so remember that here
  // until the server sends a different count (a new notification).
  const [readAt, setReadAt] = useState<number | null>(null);
  if (onPage && readAt !== unread) setReadAt(unread);
  const count = onPage || readAt === unread ? 0 : unread;

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} new` : "Notifications"}
      className={`relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-sand-100 ${
        onPage ? "bg-forest-100 text-forest-800" : "text-bark-700"
      }`}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
