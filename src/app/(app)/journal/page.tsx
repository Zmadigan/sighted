import type { Metadata } from "next";
import Link from "next/link";
import { SightingThumb } from "@/components/SightingThumb";
import { categoryInfo } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listSightings, photoUrl } from "@/lib/sightings";

export const metadata: Metadata = { title: "Journal · Sighted" };

export default async function JournalPage() {
  const user = await requireUser();
  const sightings = await listSightings(user.id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">My journal</h1>
          <p className="text-sm text-bark-500">
            {sightings.length} {sightings.length === 1 ? "sighting" : "sightings"}
          </p>
        </div>
        <Link href="/sightings/new" className="btn btn-secondary py-2 text-sm">
          + Add manually
        </Link>
      </div>

      {sightings.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-5xl" aria-hidden>
            📔
          </div>
          <p className="mt-3 font-semibold">Your journal is empty — for now!</p>
          <p className="text-sm text-bark-500">Identify your first animal to get started.</p>
          <Link href="/identify" className="btn btn-primary mt-4">
            📸 Identify an animal
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sightings.map((s) => {
            const info = categoryInfo(s.category);
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
                      <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: info.color }}>
                        {info.emoji} {info.label}
                      </span>
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
