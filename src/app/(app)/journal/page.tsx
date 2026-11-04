import type { Metadata } from "next";
import { BookOpen, Camera, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { CategoryBadge } from "@/components/CategoryIcon";
import { GetStarted } from "@/components/GetStarted";
import { SightingThumb } from "@/components/SightingThumb";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listSightings, photoUrl } from "@/lib/sightings";

export const metadata: Metadata = { title: "Journal · Sighted" };

export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const user = await requireUser();
  const { q, view } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";
  const grid = view === "grid";
  const viewHref = (v: "grid" | "list") => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (v === "grid") params.set("view", "grid");
    return params.size ? `/journal?${params}` : "/journal";
  };
  const sightings = await listSightings(user.id, search);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">My journal</h1>
          <p className="text-sm text-bark-500">
            {sightings.length} {sightings.length === 1 ? "sighting" : "sightings"}
            {search && <> matching &ldquo;{search}&rdquo;</>}
          </p>
        </div>
        <Link href="/sightings/new" className="btn btn-secondary py-2 text-sm">
          <Plus className="h-4 w-4" aria-hidden /> Add manually
        </Link>
      </div>

      <GetStarted userId={user.id} />

      <div className="mb-4 flex items-center gap-2">
      <form action="/journal" className="relative flex-1">
        {grid && <input type="hidden" name="view" value="grid" />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-500" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search your journal: cardinal, fox, 'by the pond'…"
          aria-label="Search your journal"
          className="field pl-9 pr-9"
        />
        {search && (
          <Link
            href={grid ? "/journal?view=grid" : "/journal"}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-bark-500"
          >
            <X className="h-4 w-4" />
          </Link>
        )}
      </form>
      <div className="flex shrink-0 rounded-full bg-sand-100 p-1" role="group" aria-label="Journal layout">
        {([
          { v: "list", Icon: List, label: "List view", active: !grid },
          { v: "grid", Icon: LayoutGrid, label: "Photo grid", active: grid },
        ] as const).map((t) => (
          <Link
            key={t.v}
            href={viewHref(t.v)}
            aria-label={t.label}
            aria-current={t.active ? "true" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              t.active ? "bg-white text-forest-800 shadow-sm" : "text-bark-500"
            }`}
          >
            <t.Icon className="h-4 w-4" aria-hidden />
          </Link>
        ))}
      </div>
      </div>

      {search && sightings.length === 0 ? (
        <div className="card p-8 text-center text-bark-500">
          No sightings match &ldquo;{search}&rdquo;.{" "}
          <Link href="/journal" className="font-semibold text-forest-600 underline">
            Show all
          </Link>
        </div>
      ) : sightings.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
            <BookOpen className="h-8 w-8" aria-hidden />
          </span>
          <p className="mt-3 font-semibold">Your journal is empty — for now!</p>
          <p className="text-sm text-bark-500">Identify your first animal to get started.</p>
          <Link href="/identify" className="btn btn-primary mt-4">
            <Camera className="h-5 w-5" aria-hidden /> Identify an animal
          </Link>
        </div>
      ) : grid ? (
        <ul className="-mx-4 grid grid-cols-3 gap-0.5 sm:mx-0 sm:gap-2 md:grid-cols-4">
          {sightings.map((s) => (
            <li key={s.id}>
              <Link
                href={`/journal/${s.id}`}
                className="group relative block aspect-square overflow-hidden bg-sand-100 sm:rounded-xl"
                title={`${s.commonName} · ${formatDate(s.observedOn)}`}
              >
                <SightingThumb
                  src={s.hasPhoto ? photoUrl(s) : null}
                  category={s.category}
                  alt={s.commonName}
                  className="h-full w-full transition-transform group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-xs font-bold text-white">
                  {s.commonName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sightings.map((s) => {
            return (
              <li key={s.id}>
                <Link href={`/journal/${s.id}`} className="card flex overflow-hidden hover:border-forest-300 sm:flex-col">
                  <SightingThumb
                    src={s.hasPhoto ? photoUrl(s) : null}
                    category={s.category}
                    alt={s.commonName}
                    className="h-24 w-24 shrink-0 sm:h-40 sm:w-full"
                  />
                  <div className="min-w-0 p-3">
                    <p className="truncate text-lg font-bold">{s.commonName}</p>
                    {s.scientificName && <p className="truncate text-sm italic text-bark-500">{s.scientificName}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <CategoryBadge category={s.category} />
                      <span className="text-bark-500">{formatDate(s.observedOn)}</span>
                    </p>
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
