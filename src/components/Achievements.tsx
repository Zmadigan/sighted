import { ChevronRight, Flame, Lock, PartyPopper } from "lucide-react";
import Link from "next/link";
import type { Badge, Stats } from "@/lib/achievements";
import { badgeProgress, rankFor } from "@/lib/achievements";

/** Small "Naturalist" pill, shown next to names. */
export function RankPill({ species, className = "" }: { species: number; className?: string }) {
  const rank = rankFor(species);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-0.5 text-xs font-bold text-forest-800 ${className}`}
      title={`Rank ${rank.level}: ${rank.name}`}
    >
      <rank.Icon className="h-3.5 w-3.5" aria-hidden /> {rank.name}
    </span>
  );
}

/** Orange flame with the number of weeks, hidden when there's no streak. */
export function StreakPill({ weeks, className = "" }: { weeks: number; className?: string }) {
  if (weeks <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 ${className}`}
      title={`${weeks}-week streak`}
    >
      <Flame className="h-3.5 w-3.5" aria-hidden /> {weeks}
      <span className="sr-only">-week streak</span>
    </span>
  );
}

export function BadgeIcon({ badge, earned, size = "md" }: { badge: Badge; earned: boolean; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9" : "h-14 w-14";
  const icon = size === "sm" ? "h-4.5 w-4.5" : "h-7 w-7";
  return (
    <span
      className={`relative flex ${box} shrink-0 items-center justify-center rounded-full ${
        earned ? "bg-sun-400 text-forest-900 shadow-sm ring-2 ring-sun-400/40" : "bg-sand-100 text-bark-500/60"
      }`}
    >
      <badge.Icon className={icon} aria-hidden />
      {!earned && size === "md" && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 text-bark-500">
          <Lock className="h-3 w-3" aria-hidden />
        </span>
      )}
    </span>
  );
}

/** Grid of every badge: earned ones in gold, locked ones grey with progress. */
export function BadgeGrid({ stats }: { stats: Stats }) {
  const badges = badgeProgress(stats).sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {badges.map((b) => (
        <li key={b.id} className={`card flex flex-col items-center p-3 text-center ${b.earned ? "" : "opacity-80"}`}>
          <BadgeIcon badge={b} earned={b.earned} />
          <p className="mt-2 text-sm font-bold leading-tight">{b.name}</p>
          <p className="mt-0.5 text-xs text-bark-500">{b.description}</p>
          {!b.earned && b.target > 1 && (
            <div className="mt-2 w-full">
              <div className="h-1.5 overflow-hidden rounded-full bg-sand-100">
                <div className="h-full rounded-full bg-forest-600" style={{ width: `${(b.current / b.target) * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-bark-500">
                {b.current} / {b.target}
              </p>
            </div>
          )}
          {b.earned && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-forest-600">Earned</p>}
        </li>
      ))}
    </ul>
  );
}

/** Rank, progress to the next rank, and streak, shown at the top of the Badges page. */
export function RankCard({ stats }: { stats: Stats }) {
  const rank = rankFor(stats.species);
  const toNext = rank.next ? rank.next.min - stats.species : 0;
  const pct = rank.next ? ((stats.species - rank.min) / (rank.next.min - rank.min)) * 100 : 100;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="card bg-forest-700 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <rank.Icon className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Rank {rank.level}</p>
            <p className="text-2xl font-extrabold">{rank.name}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-sun-400" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-white/85">
          {rank.next
            ? `${toNext} more species to reach ${rank.next.name}`
            : "Top rank. You're a legend!"}
        </p>
      </section>

      <section className="card p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              stats.streak > 0 ? "bg-orange-100 text-orange-600" : "bg-sand-100 text-bark-500"
            }`}
          >
            <Flame className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-bark-500">Weekly streak</p>
            <p className="text-2xl font-extrabold">
              {stats.streak} {stats.streak === 1 ? "week" : "weeks"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-bark-500">
          {stats.streak === 0
            ? "Log a sighting this week to start a streak."
            : stats.streakSafe
              ? "You're set for this week. Log another next week to keep it going!"
              : "Log a sighting before Sunday night to keep your streak alive!"}
        </p>
        <p className="mt-1 text-xs font-semibold text-bark-500">Best: {stats.bestStreak} weeks</p>
      </section>
    </div>
  );
}

/** Compact summary card linking to the Badges page (used on the Life List). */
export function AchievementsSummary({ stats }: { stats: Stats }) {
  const rank = rankFor(stats.species);
  const badges = badgeProgress(stats);
  const earned = badges.filter((b) => b.earned);
  return (
    <Link href="/badges" className="card mt-3 flex items-center gap-3 p-4 hover:border-forest-300">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-forest-900">
        <rank.Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 font-bold">
          {rank.name}
          <StreakPill weeks={stats.streak} />
        </span>
        <span className="block text-sm text-bark-500">
          {earned.length} of {badges.length} badges earned
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-bark-500" aria-hidden />
    </Link>
  );
}

/** "You earned a new badge!" shown after saving a sighting. */
export function NewBadgesBanner({ badges, newRank = null }: { badges: Badge[]; newRank?: string | null }) {
  if (badges.length === 0 && !newRank) return null;
  const title = [
    newRank && `You ranked up to ${newRank}!`,
    badges.length === 1 ? "New badge!" : badges.length > 1 ? `${badges.length} new badges!` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Link
      href="/badges"
      className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-sun-400 bg-sun-400/15 p-3 hover:bg-sun-400/25"
    >
      <span className="flex -space-x-2">
        {badges.slice(0, 3).map((b) => (
          <BadgeIcon key={b.id} badge={b} earned size="sm" />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-extrabold">
          <PartyPopper className="h-4 w-4 text-forest-700" aria-hidden />
          {title}
        </span>
        {badges.length > 0 && (
          <span className="block truncate text-sm text-bark-700">{badges.map((b) => b.name).join(", ")}</span>
        )}
      </span>
      <ChevronRight className="h-5 w-5 text-bark-500" aria-hidden />
    </Link>
  );
}
