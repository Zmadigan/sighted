import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, UserMinus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removeFriend } from "@/app/actions/friends";
import { CategoryBadge } from "@/components/CategoryIcon";
import { SightingThumb } from "@/components/SightingThumb";
import { db } from "@/db";
import { user } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { areFriends, listFriendSightings } from "@/lib/friends";
import { requireUser } from "@/lib/session";
import { photoUrl } from "@/lib/sightings";

export const metadata = { title: "Friend · Sighted" };

export default async function FriendPage({ params, searchParams }: PageProps<"/friends/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const { tab } = await searchParams;
  if (!(await areFriends(me.id, id))) notFound();

  const [[friend], sightings] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, id)),
    listFriendSightings(id),
  ]);
  if (!friend) notFound();

  // Life list: each species once, with the first date they saw it.
  const species = new Map<string, (typeof sightings)[number] & { firstSeen: string }>();
  for (const s of sightings) {
    const key = (s.scientificName || s.commonName).trim().toLowerCase();
    const existing = species.get(key);
    if (!existing || s.observedOn < existing.firstSeen) species.set(key, { ...s, firstSeen: s.observedOn });
  }
  const lifeList = [...species.values()].sort((a, b) => a.commonName.localeCompare(b.commonName));
  const showLifeList = tab === "life-list";

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/friends" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Friends
      </Link>
      <h1 className="text-2xl font-extrabold">{friend.name}</h1>
      <p className="text-sm text-bark-500">
        {lifeList.length} species · {sightings.length} sightings
      </p>

      <div className="my-4 flex gap-1 rounded-full bg-sand-100 p-1">
        {[
          { href: `/friends/${id}`, label: "Sightings", active: !showLifeList },
          { href: `/friends/${id}?tab=life-list`, label: "Life list", active: showLifeList },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`flex-1 rounded-full py-1.5 text-center text-sm font-semibold ${
              t.active ? "bg-white text-forest-800 shadow-sm" : "text-bark-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {sightings.length === 0 ? (
        <p className="card p-8 text-center text-bark-500">{friend.name} hasn&apos;t logged any sightings yet.</p>
      ) : showLifeList ? (
        <ul className="card divide-y divide-sand-200">
          {lifeList.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{s.commonName}</p>
                {s.scientificName && <p className="truncate text-sm italic text-bark-500">{s.scientificName}</p>}
              </div>
              <div className="shrink-0 text-right text-xs text-bark-500">
                <CategoryBadge category={s.category} />
                <p className="mt-1">First seen {formatDate(s.firstSeen)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {sightings.map((s) => (
            <li key={s.id} className="card overflow-hidden">
              <SightingThumb
                src={s.hasPhoto ? photoUrl(s) : null}
                category={s.category}
                alt={s.commonName}
                className={s.hasPhoto ? "max-h-72 w-full" : "h-24 w-full"}
              />
              <div className="space-y-1 p-4">
                <CategoryBadge category={s.category} />
                <p className="text-lg font-bold">{s.commonName}</p>
                {s.scientificName && <p className="text-sm italic text-bark-500">{s.scientificName}</p>}
                <p className="flex items-center gap-1.5 text-sm text-bark-500">
                  <CalendarDays className="h-4 w-4" aria-hidden /> {formatDate(s.observedOn)}
                </p>
                {s.notes && <p className="whitespace-pre-wrap pt-1 text-forest-800/90">{stripLocation(s.notes)}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={removeFriend.bind(null, id)} className="mt-6 text-center">
        <button type="submit" className="inline-flex items-center gap-1 text-sm font-semibold text-bark-500 hover:text-red-700">
          <UserMinus className="h-4 w-4" aria-hidden /> Remove friend
        </button>
      </form>
    </div>
  );
}

/** Notes from the demo data end with a "Location: …" line; keep locations private from friends. */
function stripLocation(notes: string) {
  return notes.replace(/\n*Location:[^]*$/, "").trim();
}
