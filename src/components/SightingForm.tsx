"use client";

import { ImagePlus, LocateFixed, Lock, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveSighting, type SightingInput } from "@/app/actions/sightings";
import { CATEGORIES, CATEGORY_INFO, type Category } from "@/lib/categories";
import { compressImage, todayLocal } from "@/lib/image";
import { LocationPicker } from "./map";
import type { LatLng } from "./map/LocationPickerInner";

export type SightingFormValues = {
  id?: string;
  commonName: string;
  scientificName: string;
  category: Category;
  confidence?: "high" | "medium" | "low" | null;
  funFacts?: string[] | null;
  observedOn?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  isPrivate?: boolean;
  /** URL to show the current photo (data URL or /api/photos/...) */
  photoPreview?: string | null;
};

export function SightingForm({
  initial,
  newPhoto,
  allowPhotoChange = true,
  submitLabel = "Save sighting",
}: {
  initial: SightingFormValues;
  /** Photo just taken on the Identify screen (saved along with the sighting). */
  newPhoto?: string;
  allowPhotoChange?: boolean;
  submitLabel?: string;
}) {
  const [commonName, setCommonName] = useState(initial.commonName);
  const [scientificName, setScientificName] = useState(initial.scientificName);
  const [category, setCategory] = useState<Category>(initial.category);
  // New sightings default to today, in the user's own time zone.
  const [observedOn, setObservedOn] = useState(() => initial.observedOn ?? todayLocal());
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate ?? false);
  const [location, setLocation] = useState<LatLng | null>(
    initial.latitude != null && initial.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  // undefined = keep current photo, null = remove it, string = new photo
  const [photo, setPhoto] = useState<string | null | undefined>(newPhoto);
  const preview = photo === undefined ? initial.photoPreview : photo;
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function requestPosition() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationNote(null);
        setLocating(false);
      },
      () => {
        setLocationNote("We couldn't get your location. Tap the map to place the pin.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setLocationNote("Your browser can't share its location. Tap the map instead.");
      return;
    }
    setLocating(true);
    requestPosition();
  }

  // New sightings start at the user's current location.
  useEffect(() => {
    if (!initial.id && initial.latitude == null && "geolocation" in navigator) requestPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await compressImage(file, 1024, 0.8));
    } catch {
      setError("We couldn't read that photo. Please try another one.");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: SightingInput = {
      id: initial.id,
      commonName,
      scientificName,
      category,
      confidence: initial.confidence ?? null,
      funFacts: initial.funFacts ?? null,
      observedOn,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      notes,
      isPrivate,
      photo,
    };
    startSaving(async () => {
      // On success the server redirects to the saved sighting.
      const result = await saveSighting(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Photo */}
      <div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your photo" className="max-h-72 w-full rounded-xl object-cover" />
        ) : (
          allowPhotoChange && (
            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-sand-200 text-bark-500">
              No photo
            </div>
          )
        )}
        {allowPhotoChange && (
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn btn-secondary py-2 text-sm" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="h-4 w-4" aria-hidden />
              {preview ? "Change photo" : "Add a photo"}
            </button>
            {preview && (
              <button type="button" className="btn py-2 text-sm text-red-700" onClick={() => setPhoto(null)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Remove photo
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Animal name</span>
        <input
          className="field"
          required
          placeholder="e.g. Northern Cardinal"
          value={commonName}
          onChange={(e) => setCommonName(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">
          Scientific name <span className="font-normal text-bark-500">(optional)</span>
        </span>
        <input
          className="field italic"
          placeholder="e.g. Cardinalis cardinalis"
          value={scientificName}
          onChange={(e) => setScientificName(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Category</span>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_INFO[c].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Date seen</span>
          <input
            className="field"
            type="date"
            required
            // The server may be in a different time zone than the user
            suppressHydrationWarning
            value={observedOn}
            onChange={(e) => setObservedOn(e.target.value)}
          />
        </label>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold">Location</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600"
            onClick={() => locateMe()}
            disabled={locating}
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            {locating ? "Finding you…" : "Use my location"}
          </button>
        </div>
        <LocationPicker value={location} onChange={setLocation} color={CATEGORY_INFO[category].color} />
        <p className="mt-1 text-xs text-bark-500">
          {locationNote ?? (location ? "Drag the pin or tap the map to adjust." : "Tap the map to drop a pin.")}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">
          Notes <span className="font-normal text-bark-500">(optional)</span>
        </span>
        <textarea
          className="field min-h-24"
          placeholder="What was it doing? Weather, behavior, who you were with…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-sand-200 bg-white p-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-forest-600"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        <span>
          <span className="flex items-center gap-1.5 font-semibold">
            <Lock className="h-4 w-4 text-bark-500" aria-hidden /> Keep private
          </span>
          <span className="block text-xs text-bark-500">
            Friends won&apos;t see this sighting in their feed or on your profile.
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
