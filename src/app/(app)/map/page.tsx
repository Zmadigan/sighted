import type { Metadata } from "next";
import Link from "next/link";
import { SightingsMap } from "@/components/map";
import { CATEGORIES, CATEGORY_INFO } from "@/lib/categories";
import { requireUser } from "@/lib/session";
import { listMappedSightings } from "@/lib/sightings";

export const metadata: Metadata = { title: "My Map · Sighted" };

export default async function MapPage() {
  const user = await requireUser();
  const rows = await listMappedSightings(user.id);
  const sightings = rows.map((s) => ({
    id: s.id,
    commonName: s.commonName,
    category: s.category,
    observedOn: s.observedOn,
    latitude: s.latitude!,
    longitude: s.longitude!,
    hasPhoto: s.hasPhoto,
  }));

  return (
    <div>
      <h1 className="text-2xl font-extrabold">My map</h1>
      <ul className="my-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
        {CATEGORIES.map((c) => (
          <li key={c} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: CATEGORY_INFO[c].color }} />
            {CATEGORY_INFO[c].label}
          </li>
        ))}
      </ul>
      <SightingsMap sightings={sightings} />
      {sightings.length === 0 && (
        <p className="mt-3 text-center text-sm text-bark-500">
          No pins yet. <Link href="/identify" className="font-semibold text-forest-600 underline">Identify an animal</Link> and
          save it with a location.
        </p>
      )}
    </div>
  );
}
