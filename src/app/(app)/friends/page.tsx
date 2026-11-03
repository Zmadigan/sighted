import { ChevronRight, Trophy, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { DisplayName, InviteLink } from "@/components/FriendsClient";
import { getInviteCode, leaderboard, listFriends, type Period } from "@/lib/friends";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Friends · Sighted" };

const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

const MEDALS = ["bg-sun-400 text-forest-900", "bg-sand-200 text-bark-700", "bg-[#e3b98f] text-bark-700"];

export default async function FriendsPage({ searchParams }: PageProps<"/friends">) {
  const me = await requireUser();
  const { period: rawPeriod, added } = await searchParams;
  const period: Period = rawPeriod === "year" || rawPeriod === "all" ? rawPeriod : "month";

  const h = await headers();
  const origin = h.get("x-forwarded-host")
    ? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host")}`
    : `http://${h.get("host")}`;

  const [code, friends] = await Promise.all([getInviteCode(me.id), listFriends(me.id)]);
  const people = [{ id: me.id, name: me.name, isMe: true }, ...friends.map((f) => ({ ...f, isMe: false }))];
  const counts = await leaderboard(
    people.map((p) => p.id),
    period,
  );
  const ranked = people
    .map((p) => ({ ...p, species: counts.get(p.id)?.species ?? 0, sightings: counts.get(p.id)?.sightings ?? 0 }))
    .sort((a, b) => b.species - a.species || b.sightings - a.sightings || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Friends</h1>
        <DisplayName name={me.name} />
      </div>

      {typeof added === "string" && (
        <p className="rounded-lg bg-forest-100 p-3 text-sm font-semibold text-forest-800">
          You and {added} are now friends. Let the spotting begin!
        </p>
      )}

      {/* Leaderboard */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-sand-200 p-4">
          <Trophy className="h-5 w-5 text-sun-400" aria-hidden />
          <h2 className="font-bold">Leaderboard</h2>
          <span className="ml-auto text-xs text-bark-500">ranked by species seen</span>
        </div>
        <div className="flex gap-1 p-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/friends?period=${p.id}`}
              className={`flex-1 rounded-full py-1.5 text-center text-sm font-semibold ${
                period === p.id ? "bg-forest-600 text-white" : "text-bark-700 hover:bg-sand-100"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <ol className="divide-y divide-sand-200">
          {ranked.map((p, i) => {
            const row = (
              <>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                    MEDALS[i] ?? "bg-sand-100 text-bark-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">
                  {p.name}
                  {p.isMe && <span className="ml-1 font-normal text-bark-500">(you)</span>}
                </span>
                <span className="text-right">
                  <span className="block font-extrabold text-forest-700">{p.species} species</span>
                  <span className="block text-xs text-bark-500">{p.sightings} sightings</span>
                </span>
                {!p.isMe && <ChevronRight className="h-4 w-4 text-bark-500" aria-hidden />}
              </>
            );
            return (
              <li key={p.id} className={p.isMe ? "bg-forest-50" : ""}>
                {p.isMe ? (
                  <div className="flex items-center gap-3 px-4 py-3">{row}</div>
                ) : (
                  <Link href={`/friends/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand-50">
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
        {friends.length === 0 && (
          <p className="flex items-center gap-2 border-t border-sand-200 p-4 text-sm text-bark-500">
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            It&apos;s lonely at the top! Invite a friend below to start competing.
          </p>
        )}
      </section>

      {/* Invite */}
      <section className="card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-bold">
          <UserPlus className="h-5 w-5 text-forest-600" aria-hidden /> Invite friends
        </h2>
        <p className="mb-3 text-sm text-bark-500">
          Anyone who opens your link can add you. Friends see your sightings, photos and notes — never your locations.
        </p>
        <InviteLink url={`${origin}/invite/${code}`} />
      </section>
    </div>
  );
}
