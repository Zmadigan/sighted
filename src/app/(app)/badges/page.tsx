import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeGrid, RankCard } from "@/components/Achievements";
import { RANKS, badgeProgress, rankFor, statsForUser } from "@/lib/achievements";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Badges · Sighted" };

export default async function BadgesPage() {
  const user = await requireUser();
  const stats = await statsForUser(user.id);
  const earned = badgeProgress(stats).filter((b) => b.earned).length;
  const current = rankFor(stats.species);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/life-list" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Life list
        </Link>
        <h1 className="text-2xl font-extrabold">Badges &amp; rank</h1>
        <p className="text-sm text-bark-500">
          See more species to rank up, log a sighting every week to build your streak, and collect badges along the way.
        </p>
      </div>

      <RankCard stats={stats} />

      <section>
        <h2 className="mb-2 flex items-baseline justify-between font-bold">
          Badges <span className="text-sm font-semibold text-bark-500">{earned} earned</span>
        </h2>
        <BadgeGrid stats={stats} />
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-bold">All ranks</h2>
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
