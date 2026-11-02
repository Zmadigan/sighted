import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSightingButton } from "@/components/DeleteSightingButton";
import { SightingsMap } from "@/components/map";
import { SightingThumb } from "@/components/SightingThumb";
import { categoryInfo } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getSighting, photoUrl } from "@/lib/sightings";

export default async function SightingPage({ params }: PageProps<"/journal/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const s = await getSighting(user.id, id);
  if (!s) notFound();

  const info = categoryInfo(s.category);

  return (
    <article className="mx-auto max-w-xl">
      <Link href="/journal" className="mb-3 inline-block text-sm font-semibold text-forest-600">
        ← Journal
      </Link>
      <div className="card overflow-hidden">
        <SightingThumb
          src={s.hasPhoto ? photoUrl(s) : null}
          category={s.category}
          alt={s.commonName}
          className="max-h-96 min-h-40 w-full"
        />
        <div className="space-y-4 p-5">
          <div>
            <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: info.color }}>
              {info.emoji} {info.label}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold">{s.commonName}</h1>
            {s.scientificName && <p className="italic text-bark-500">{s.scientificName}</p>}
            <p className="mt-1 text-sm font-semibold">
              📅 {formatDate(s.observedOn, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {s.notes && (
            <div>
              <h2 className="font-bold">Notes</h2>
              <p className="whitespace-pre-wrap text-forest-800/90">{s.notes}</p>
            </div>
          )}

          {s.funFacts && s.funFacts.length > 0 && (
            <div className="rounded-xl bg-forest-50 p-4">
              <h2 className="mb-2 font-bold">Fun facts</h2>
              <ul className="space-y-2">
                {s.funFacts.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span aria-hidden>🌱</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.latitude != null && s.longitude != null && (
            <div>
              <h2 className="mb-2 font-bold">Where</h2>
              <SightingsMap
                compact
                sightings={[
                  {
                    id: s.id,
                    commonName: s.commonName,
                    category: s.category,
                    observedOn: s.observedOn,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    hasPhoto: false,
                  },
                ]}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/journal/${s.id}/edit`} className="btn btn-secondary flex-1">
              Edit
            </Link>
            <DeleteSightingButton id={s.id} name={s.commonName} />
          </div>
        </div>
      </div>
    </article>
  );
}
