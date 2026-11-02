import Link from "next/link";
import { notFound } from "next/navigation";
import { SightingForm } from "@/components/SightingForm";
import { isCategory } from "@/lib/categories";
import { requireUser } from "@/lib/session";
import { getSighting, photoUrl } from "@/lib/sightings";

export default async function EditSightingPage({ params }: PageProps<"/journal/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();
  const s = await getSighting(user.id, id);
  if (!s) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/journal/${s.id}`} className="mb-3 inline-block text-sm font-semibold text-forest-600">
        ← Back
      </Link>
      <div className="card p-5">
        <h1 className="mb-4 text-2xl font-extrabold">Edit sighting</h1>
        <SightingForm
          submitLabel="Save changes"
          initial={{
            id: s.id,
            commonName: s.commonName,
            scientificName: s.scientificName ?? "",
            category: isCategory(s.category) ? s.category : "other",
            confidence: (s.confidence as "high" | "medium" | "low" | null) ?? null,
            funFacts: s.funFacts,
            observedOn: s.observedOn,
            latitude: s.latitude,
            longitude: s.longitude,
            notes: s.notes ?? "",
            photoPreview: s.hasPhoto ? photoUrl(s) : null,
          }}
        />
      </div>
    </div>
  );
}
