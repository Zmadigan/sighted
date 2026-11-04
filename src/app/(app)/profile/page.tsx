import { eq, sql } from "drizzle-orm";
import { Crown, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeGrid, RankCard, RankPill } from "@/components/Achievements";
import { AvatarUpload } from "@/components/AvatarUpload";
import { DisplayName } from "@/components/FriendsClient";
import { db } from "@/db";
import { user } from "@/db/schema";
import { RANKS, badgeProgress, rankFor, statsForUser } from "@/lib/achievements";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My profile · Sighted" };

export default async function ProfilePage() {
  const me = await requireUser();
  const [stats, [row]] = await Promise.all([
    statsForUser(me.id),
    db.select({ hasImage: sql<boolean>`${user.image} is not null` }).from(user).where(eq(user.id, me.id)),
  ]);
  const earned = badgeProgress(stats).filter((b) => b.earned).length;
  const current = rankFor(stats.species);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex justify-end">
        <Link href="/account" className="btn btn-secondary px-3 py-2 text-sm">
          <Settings className="h-4 w-4" aria-hidden /> Settings
        </Link>
      </div>

      <section className="flex flex-col items-center text-center">
        <AvatarUpload userId={me.id} name={me.name} version={me.updatedAt.getTime()} hasImage={row?.hasImage ?? false} />
        <h1 className="mt-3 text-2xl font-extrabold">{me.name}</h1>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <RankPill species={stats.species} />
          {me.plan === "pro" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sun-400 px-2 py-0.5 text-xs font-bold">
              <Crown className="h-3.5 w-3.5" aria-hidden /> Pro
            </span>
          )}
        </div>
        <div className="mt-1">
          <DisplayName name={me.name} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { value: stats.species, label: "species", href: "/life-list" },
          { value: stats.sightings, label: "sightings", href: "/journal" },
          { value: stats.friends, label: stats.friends === 1 ? "friend" : "friends", href: "/friends?view=leaderboard" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="card p-3 text-center hover:border-forest-300">
            <p className="text-2xl font-extrabold text-forest-700">{s.value}</p>
            <p className="text-xs font-semibold text-bark-500">{s.label}</p>
          </Link>
        ))}
      </section>

      <RankCard stats={stats} />

      <section>
        <h2 className="mb-2 flex items-baseline justify-between font-bold">
          Badges <span className="text-sm font-semibold text-bark-500">{earned} earned</span>
        </h2>
        <BadgeGrid stats={stats} />
      </section>

      <section className="card p-4">
        <h2 className="mb-1 font-bold">All ranks</h2>
        <p className="mb-2 text-sm text-bark-500">See more species to rank up. Log a sighting every week to build your streak.</p>
        <ol className="divide-y divide-sand-200">
          {RANKS.map((r, i) => {
            const reached = stats.species >= r.min;
            const isCurrent = current.level === i + 1;
            return (
              <li key={r.name} className={`flex items-center gap-3 py-2 ${reached ? "" : "text-bark-500"}`}>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCurrent ? "bg-forest-700 text-white" : reached ? "bg-forest-100 text-forest-700" : "bg-sand-100"
                  }`}
                >
                  <r.Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex-1 font-semibold">
                  {r.name}
                  {isCurrent && <span className="ml-1.5 text-xs font-bold text-forest-600">YOU</span>}
                </span>
                <span className="text-sm">{r.min === 0 ? "Start" : `${r.min} species`}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
