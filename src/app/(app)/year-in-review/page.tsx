import { ArrowLeft, Binoculars, Camera, Calendar, Eye, Sparkles, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryBadge, CategoryIcon } from "@/components/CategoryIcon";
import { categoryInfo } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { yearInReview } from "@/lib/progress";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Year in Review · Sighted" };

export default async function YearInReviewPage({ searchParams }: PageProps<"/year-in-review">) {
  const user = await requireUser();
  if (user.plan !== "pro") redirect("/upgrade");

  const thisYear = new Date().getFullYear();
  const { year: rawYear } = await searchParams;
  const asked = Number(rawYear);
  const year = Number.isInteger(asked) && asked >= 2000 && asked <= thisYear ? asked : thisYear;
  const r = await yearInReview(user.id, year);
  const maxMonth = Math.max(1, ...r.months.map((m) => m.sightings));

  const stats = [
    { label: "species", value: r.species, Icon: Star },
    { label: "sightings", value: r.sightings, Icon: Eye },
    { label: "new to your life list", value: r.lifers, Icon: Sparkles },
    { label: "photos", value: r.photos, Icon: Camera },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/life-list" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Life list
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-forest-700 p-6 text-white">
        <p className="text-sm font-semibold text-forest-100">{user.name}&apos;s</p>
        <h1 className="text-4xl font-extrabold">{year} in wildlife</h1>
        {r.sightings === 0 ? (
          <p className="mt-2 text-forest-100">No sightings logged in {year} yet. Get out there!</p>
        ) : (
          <p className="mt-2 text-forest-100">
            You logged <strong className="text-white">{r.sightings}</strong> sightings of{" "}
            <strong className="text-white">{r.species}</strong> different species.
          </p>
        )}
        <div className="mt-4 flex gap-2 text-sm">
          {[year - 1, year + 1]
            .filter((y) => y <= thisYear && y >= 2000)
            .map((y) => (
              <Link key={y} href={`/year-in-review?year=${y}`} className="rounded-full bg-white/15 px-3 py-1 font-semibold hover:bg-white/25">
                {y < year ? `← ${y}` : `${y} →`}
              </Link>
            ))}
        </div>
      </section>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <s.Icon className="h-5 w-5 text-forest-600" aria-hidden />
            <p className="mt-1 text-3xl font-extrabold text-forest-800">{s.value}</p>
            <p className="text-sm text-bark-500">{s.label}</p>
          </div>
        ))}
      </div>

      {r.sightings > 0 && (
        <>
          {/* Sightings per month */}
          <section className="card p-4">
            <h2 className="font-bold">Sightings by month</h2>
            {r.busiest && (
              <p className="text-sm text-bark-500">
                Busiest month: <strong className="text-forest-800">{r.busiest.month}</strong> ({r.busiest.sightings})
              </p>
            )}
            <div className="mt-4 flex h-36 items-end gap-0.5" aria-hidden>
              {r.months.map((m) => (
                <div key={m.month} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                  {m === r.busiest && <span className="mb-1 text-xs font-bold text-forest-800">{m.sightings}</span>}
                  <div
                    className="w-full max-w-7 rounded-t-[4px] bg-forest-500 transition-opacity group-hover:opacity-80"
                    style={{ height: `${(m.sightings / maxMonth) * 100}%`, minHeight: m.sightings ? 4 : 0 }}
                  />
                  {/* Hover tooltip */}
                  <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-forest-900 px-2 py-1 text-xs text-white group-hover:block">
                    {m.month}: {m.sightings}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-0.5 border-t border-sand-200 pt-1" aria-hidden>
              {r.months.map((m) => (
                <span key={m.month} className="flex-1 text-center text-[10px] text-bark-500">
                  {m.month[0]}
                </span>
              ))}
            </div>
            <table className="sr-only">
              <caption>Sightings by month in {year}</caption>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.month}>
                    <th>{m.month}</th>
                    <td>{m.sightings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Highlights */}
          <section className="card divide-y divide-sand-200">
            {r.mostSeen && (
              <div className="flex items-center gap-3 p-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${categoryInfo(r.mostSeen.category).color}1f`, color: categoryInfo(r.mostSeen.category).color }}
                >
                  <CategoryIcon category={r.mostSeen.category} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-bark-500">Most-seen animal</p>
                  <p className="font-bold">
                    {r.mostSeen.name} <span className="font-normal text-bark-500">· {r.mostSeen.count} times</span>
                  </p>
                </div>
              </div>
            )}
            {r.topCategory && (
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-100 text-bark-700">
                  <Star className="h-5 w-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-sm text-bark-500">Favorite kind of animal</p>
                  <p className="font-bold">{r.topCategory.species} species</p>
                </div>
                <CategoryBadge category={r.topCategory.category} />
              </div>
            )}
            {r.first && (
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-100 text-bark-700">
                  <Calendar className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-bark-500">First sighting of the year</p>
                  <p className="font-bold">
                    {r.first.name} <span className="font-normal text-bark-500">· {formatDate(r.first.date)}</span>
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-400 text-forest-900">
                <Binoculars className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-bark-500">Birds of the Week found</p>
                <p className="font-bold">{r.birdsOfWeek}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
