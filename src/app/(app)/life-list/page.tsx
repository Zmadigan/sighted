import type { Metadata } from "next";
import { ChevronRight, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AchievementsSummary } from "@/components/Achievements";
import { Goals } from "@/components/Goals";
import { statsForUser } from "@/lib/achievements";
import { CATEGORIES, CATEGORY_INFO, categoryInfo, isCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { goalsWithProgress, MAX_GOALS } from "@/lib/progress";
import { listSightings } from "@/lib/sightings";

export const metadata: Metadata = { title: "Life List · Sighted" };

type Species = {
  key: string;
  commonName: string;
  scientificName: string | null;
  category: string;
  firstSeen: string;
  firstSightingId: string;
  lastSeen: string;
  count: number;
};

export default async function LifeListPage({ searchParams }: PageProps<"/life-list">) {
  const user = await requireUser();
  const { category } = await searchParams;
  const filter = isCategory(category) ? category : null;

  // Group sightings into unique species (by scientific name, or common name if there isn't one).
  const sightings = await listSightings(user.id);
  const bySpecies = new Map<string, Species>();
  for (const s of sightings) {
    const key = (s.scientificName || s.commonName).trim().toLowerCase();
    const existing = bySpecies.get(key);
    if (!existing) {
      bySpecies.set(key, {
        key,
        commonName: s.commonName,
        scientificName: s.scientificName,
        category: s.category,
        firstSeen: s.observedOn,
        firstSightingId: s.id,
        lastSeen: s.observedOn,
        count: 1,
      });
    } else {
      existing.count++;
      if (s.observedOn < existing.firstSeen) {
        existing.firstSeen = s.observedOn;
        existing.firstSightingId = s.id;
      }
      if (s.observedOn > existing.lastSeen) existing.lastSeen = s.observedOn;
    }
  }
  const allSpecies = [...bySpecies.values()];

  const thisYear = String(new Date().getFullYear());
  const speciesThisYear = allSpecies.filter((sp) => sp.lastSeen.startsWith(thisYear)).length;
  const perCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c, allSpecies.filter((sp) => sp.category === c).length]),
  );

  const shown = allSpecies
    .filter((sp) => !filter || sp.category === filter)
    .sort((a, b) => a.commonName.localeCompare(b.commonName));

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Life list</h1>
      <p className="text-sm text-bark-500">Every species you&apos;ve ever seen.</p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-extrabold text-forest-700">{allSpecies.length}</p>
          <p className="text-sm font-semibold text-bark-500">total species</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-extrabold text-forest-700">{speciesThisYear}</p>
          <p className="text-sm font-semibold text-bark-500">species in {thisYear}</p>
        </div>
      </div>

      {/* Rank, streak and badges */}
      <AchievementsSummary stats={await statsForUser(user.id)} />

      {/* Pro: goals and year in review */}
      <Goals goals={user.plan === "pro" ? await goalsWithProgress(user.id) : []} isPro={user.plan === "pro"} max={MAX_GOALS} />
      <Link
        href={user.plan === "pro" ? `/year-in-review?year=${thisYear}` : "/upgrade"}
        className="card mt-3 flex items-center gap-3 p-4 hover:border-forest-300"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-white">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Your {thisYear} in review</span>
          <span className="block text-sm text-bark-500">Your year in wildlife, by the numbers.</span>
        </span>
        {user.plan === "pro" ? (
          <ChevronRight className="h-5 w-5 text-bark-500" aria-hidden />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-forest-600 px-3 py-1.5 text-xs font-bold text-white">
            <Crown className="h-3.5 w-3.5" aria-hidden /> Pro
          </span>
        )}
      </Link>

      {/* Category filter, which doubles as per-category counts */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <FilterChip href="/life-list" active={!filter} label={`All · ${allSpecies.length}`} />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              href={`/life-list?category=${c}`}
              active={filter === c}
              label={
                <>
                  <CategoryIcon category={c} className="h-4 w-4" />
                  {CATEGORY_INFO[c].label} · {perCategory[c]}
                </>
              }
            />
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-bark-500">
          {allSpecies.length === 0 ? "Your life list starts with your first sighting!" : "No species in this category yet."}
        </div>
      ) : (
        <ul className="card mt-4 divide-y divide-sand-200">
          {shown.map((sp) => {
            const info = categoryInfo(sp.category);
            return (
              <li key={sp.key}>
                <Link href={`/journal/${sp.firstSightingId}`} className="flex items-center gap-3 p-3 hover:bg-sand-50">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${info.color}1f`, color: info.color }}
                  >
                    <CategoryIcon category={sp.category} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{sp.commonName}</p>
                    {sp.scientificName && <p className="truncate text-sm italic text-bark-500">{sp.scientificName}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-bark-500">
                    <p>First seen</p>
                    <p className="font-semibold text-forest-800">{formatDate(sp.firstSeen)}</p>
                    {sp.count > 1 && <p>{sp.count} sightings</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold ${
        active ? "border-forest-600 bg-forest-600 text-white" : "border-sand-200 bg-white text-bark-700"
      }`}
    >
      {label}
    </Link>
  );
}
