import type { Metadata } from "next";
import { SightingForm } from "@/components/SightingForm";

export const metadata: Metadata = { title: "Add a sighting · Sighted" };

export default function NewSightingPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-5">
        <h1 className="text-2xl font-extrabold">Add a sighting</h1>
        <p className="mb-4 text-sm text-bark-500">
          Log an animal you saw — a photo is optional. Manual entries don&apos;t use any AI identifications.
        </p>
        <SightingForm initial={{ commonName: "", scientificName: "", category: "bird" }} />
      </div>
    </div>
  );
}
