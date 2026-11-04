import { ArrowLeft, CalendarDays, Lock, Pencil, Sprout } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewBadgesBanner } from "@/components/Achievements";
import { CategoryBadge } from "@/components/CategoryIcon";
import { DeleteSightingButton } from "@/components/DeleteSightingButton";
import { SightingsMap } from "@/components/map";
import { SightingThumb } from "@/components/SightingThumb";
import { badgesById, rankFor, statsForUser } from "@/lib/achievements";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getSighting, photoUrl } from "@/lib/sightings";

export default async function SightingPage({ params, searchParams }: PageProps<"/journal/[id]">) {
  const { id } = await params;
  const { badges, rankup } = await searchParams;
  const newBadges = typeof badges === "string" ? badgesById(badges.split(",")) : [];
  const user = await requireUser();
  const s = await getSighting(user.id, id);
  if (!s) notFound();

  return (
    <article className="mx-auto max-w-xl">
      <Link href="/journal" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Journal
      </Link>
      <NewBadgesBanner
        badges={newBadges}
        newRank={rankup ? rankFor((await statsForUser(user.id)).species).name : null}
      />
      <div className="card overflow-hidden">
        <SightingThumb
          src={s.hasPhoto ? photoUrl(s) : null}
          category={s.category}
          alt={s.commonName}
          className="max-h-96 min-h-40 w-full"
        />
        <div className="space-y-4 p-5">
          <div>
            <span className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={s.category} />
              {s.isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-xs font-bold text-bark-700">
                  <Lock className="h-3.5 w-3.5" aria-hidden /> Private
                </span>
              )}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold">{s.commonName}</h1>
            {s.scientificName && <p className="italic text-bark-500">{s.scientificName}</p>}
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-forest-600" aria-hidden />
              {formatDate(s.observedOn, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
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
                    <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
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
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Link>
            <DeleteSightingButton id={s.id} name={s.commonName} />
          </div>
        </div>
      </div>
    </article>
  );
}
