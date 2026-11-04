import { Binoculars, Camera, ChevronRight, Newspaper, Trophy, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { RankPill, StreakPill } from "@/components/Achievements";
import { Feed } from "@/components/Feed";
import { FindFriends, FriendRequests } from "@/components/FindFriends";
import { DisplayName, InviteLink } from "@/components/FriendsClient";
import { statsFor } from "@/lib/achievements";
import { foundThisWeek } from "@/lib/bird-of-week";
import { getFeed } from "@/lib/feed";
import { getInviteCode, incomingRequests, leaderboard, listFriends, type Period } from "@/lib/friends";
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
  const { period: rawPeriod, added, view } = await searchParams;
  const period: Period = rawPeriod === "year" || rawPeriod === "all" ? rawPeriod : "month";
  const showLeaderboard = view === "leaderboard";
  const showAdd = view === "add";

  const h = await headers();
  const origin = h.get("x-forwarded-host")
    ? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host")}`
    : `http://${h.get("host")}`;

  const [code, friends, requests] = await Promise.all([
    getInviteCode(me.id),
    listFriends(me.id),
    incomingRequests(me.id),
  ]);
  const people = [{ id: me.id, name: me.name, isMe: true }, ...friends.map((f) => ({ ...f, isMe: false }))];
  const ids = people.map((p) => p.id);
  const [counts, foundBird, feed, achievements] = await Promise.all([
    leaderboard(ids, period),
    foundThisWeek(ids),
    showLeaderboard || showAdd ? null : getFeed(me.id, null),
    showLeaderboard ? statsFor(ids) : null,
  ]);
  const ranked = people
    .map((p) => ({ ...p, species: counts.get(p.id)?.species ?? 0, sightings: counts.get(p.id)?.sightings ?? 0 }))
    .sort((a, b) => b.species - a.species || b.sightings - a.sightings || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Friends</h1>
          <DisplayName name={me.name} />
        </div>
        <Link
          href={showAdd ? "/friends" : "/friends?view=add"}
          className={`btn shrink-0 px-3 py-2 text-sm ${showAdd ? "btn-secondary" : "btn-primary"}`}
        >
          <UserPlus className="h-4 w-4" aria-hidden /> {showAdd ? "Done" : "Add friends"}
        </Link>
      </div>

      <FriendRequests requests={requests} />

      {typeof added === "string" && (
        <p className="rounded-lg bg-forest-100 p-3 text-sm font-semibold text-forest-800">
          You and {added} are now friends. Let the spotting begin!
        </p>
      )}

      {showAdd && <InviteCard url={`${origin}/invite/${code}`} />}

      {!showAdd && (
      <>
      {/* Feed / Leaderboard switch */}
      <div className="flex gap-1 rounded-full bg-sand-100 p-1">
        {[
          { href: "/friends", label: "Feed", Icon: Newspaper, active: !showLeaderboard },
          { href: "/friends?view=leaderboard", label: "Leaderboard", Icon: Trophy, active: showLeaderboard },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${
              t.active ? "bg-white text-forest-800 shadow-sm" : "text-bark-700"
            }`}
          >
            <t.Icon className="h-4 w-4" aria-hidden /> {t.label}
          </Link>
        ))}
      </div>

      {feed && friends.length === 0 && <InviteCard url={`${origin}/invite/${code}`} />}

      {feed &&
        (feed.posts.length > 0 ? (
          <Feed initial={feed.posts} initialCursor={feed.next} />
        ) : (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
              <Camera className="h-8 w-8" aria-hidden />
            </span>
            <p className="font-semibold">No photos in your feed yet</p>
            <p className="text-sm text-bark-500">
              When you or your friends save a sighting with a photo, it shows up here.
            </p>
            <Link href="/identify" className="btn btn-primary mt-1">
              <Camera className="h-5 w-5" aria-hidden /> Identify an animal
            </Link>
          </div>
        ))}

      {showLeaderboard && (
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
              href={`/friends?view=leaderboard&period=${p.id}`}
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {p.name}
                    {p.isMe && <span className="ml-1 font-normal text-bark-500">(you)</span>}
                    {foundBird.has(p.id) && (
                      <span
                        className="ml-1.5 inline-flex translate-y-0.5 items-center rounded-full bg-sun-400 p-1 text-forest-900"
                        title="Found this week's Bird of the Week"
                      >
                        <Binoculars className="h-3 w-3" aria-label="Found this week's Bird of the Week" />
                      </span>
                    )}
                  </span>
                  {achievements?.get(p.id) && (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      <RankPill species={achievements.get(p.id)!.species} />
                      <StreakPill weeks={achievements.get(p.id)!.streak} />
                    </span>
                  )}
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
        {foundBird.size > 0 && (
          <p className="flex items-center gap-1.5 border-t border-sand-200 px-4 py-2 text-xs text-bark-500">
            <span className="inline-flex rounded-full bg-sun-400 p-1 text-forest-900">
              <Binoculars className="h-3 w-3" aria-hidden />
            </span>
            found this week&apos;s Bird of the Week
          </p>
        )}
        {friends.length === 0 && (
          <p className="flex items-center gap-2 border-t border-sand-200 p-4 text-sm text-bark-500">
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            It&apos;s lonely at the top! Invite a friend below to start competing.
          </p>
        )}
      </section>
      )}

      {showLeaderboard && <InviteCard url={`${origin}/invite/${code}`} />}
      </>
      )}
    </div>
  );
}

function InviteCard({ url }: { url: string }) {
  return (
    <section className="card space-y-4 p-4" id="add-friends">
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-bold">
          <UserPlus className="h-5 w-5 text-forest-600" aria-hidden /> Find friends
        </h2>
        <FindFriends />
      </div>
      <div className="border-t border-sand-200 pt-4">
        <h3 className="mb-1 font-bold">Or send your invite link</h3>
        <p className="mb-3 text-sm text-bark-500">
          Anyone who opens your link can add you. Friends see your sightings, photos and notes — never your locations or
          anything you mark private.
        </p>
        <InviteLink url={url} />
      </div>
    </section>
  );
}
