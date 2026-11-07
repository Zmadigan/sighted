import { Bell, Heart, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TimeAgo } from "@/components/TimeAgo";
import { listNotifications, markAllRead } from "@/lib/notifications";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Notifications · Sighted" };

const ICONS = {
  reaction: { Icon: Heart, color: "bg-red-100 text-red-600" },
  comment: { Icon: MessageCircle, color: "bg-forest-100 text-forest-700" },
  friend_request: { Icon: UserPlus, color: "bg-sun-400/30 text-bark-700" },
  friend_accepted: { Icon: UserCheck, color: "bg-forest-100 text-forest-700" },
} as const;

export default async function NotificationsPage() {
  const me = await requireUser();
  const items = await listNotifications(me.id);
  // Opening this page counts as reading them (the list above still shows which were new).
  await markAllRead(me.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-extrabold">Notifications</h1>
      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
            <Bell className="h-8 w-8" aria-hidden />
          </span>
          <p className="font-semibold">Nothing yet</p>
          <p className="text-sm text-bark-500">
            When friends react to or comment on your sightings, or send you friend requests, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-sand-200 overflow-hidden">
          {items.map((n) => {
            const kind = ICONS[n.type as keyof typeof ICONS] ?? ICONS.comment;
            const onMine = n.sightingOwnerId === me.id;
            const animal = n.animal ?? "sighting";
            const message =
              n.type === "reaction"
                ? `said "Nice spot!" on your ${animal}`
                : n.type === "comment"
                  ? onMine
                    ? `commented on your ${animal}`
                    : `also commented on ${n.sightingOwnerId === n.actorId ? "their" : `${n.sightingOwnerName}'s`} ${animal}`
                  : n.type === "friend_request"
                    ? "sent you a friend request"
                    : "is now your friend";
            const href =
              n.type === "friend_request"
                ? "/friends"
                : n.type === "friend_accepted"
                  ? `/friends/${n.actorId}`
                  : n.sightingId
                    ? `/post/${n.sightingId}`
                    : "/friends";
            return (
              <li key={n.id}>
                <Link href={href} className={`flex items-start gap-3 p-3 hover:bg-sand-50 ${n.unread ? "bg-forest-50" : ""}`}>
                  <span className="relative">
                    <Avatar userId={n.actorId} name={n.actorName} className="h-10 w-10" />
                    <span className={`absolute -bottom-1 -right-1 rounded-full p-1 ring-2 ring-white ${kind.color}`}>
                      <kind.Icon className="h-3 w-3" aria-hidden />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-bold">{n.actorName}</span> {message}
                    {n.commentText && (
                      <span className="mt-0.5 block truncate text-bark-700">&ldquo;{n.commentText}&rdquo;</span>
                    )}
                    <span className="mt-0.5 block text-xs text-bark-500">
                      <TimeAgo iso={n.createdAt.toISOString()} />
                    </span>
                  </span>
                  {n.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-forest-600" aria-label="New" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
