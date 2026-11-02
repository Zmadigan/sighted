"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Identification } from "@/lib/identify";
import { CATEGORY_INFO } from "@/lib/categories";
import { compressImage } from "@/lib/image";
import { SightingForm } from "./SightingForm";

type State =
  | { step: "pick" }
  | { step: "loading" }
  | { step: "result"; result: Extract<Identification, { foundAnimal: true }> }
  | { step: "save"; result: Extract<Identification, { foundAnimal: true }> }
  | { step: "no-animal"; message: string }
  | { step: "limit"; message: string }
  | { step: "error"; message: string };

const confidenceStyles = {
  high: "bg-forest-100 text-forest-800",
  medium: "bg-sun-400/30 text-bark-700",
  low: "bg-red-100 text-red-800",
};

export function IdentifyClient({ initialRemaining }: { initialRemaining: number | null }) {
  const [state, setState] = useState<State>(
    initialRemaining === 0 ? { step: "limit", message: limitMessage() } : { step: "pick" },
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    setState({ step: "loading" });
    let image: string;
    try {
      image = await compressImage(file);
    } catch {
      setState({ step: "error", message: "We couldn't read that photo. Please try another one." });
      return;
    }
    setPhoto(image);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (data.error === "limit") return setState({ step: "limit", message: data.message });
      if (!res.ok) return setState({ step: "error", message: data.error ?? "Something went wrong." });

      const result = data.result as Identification;
      setState(
        result.foundAnimal ? { step: "result", result } : { step: "no-animal", message: result.message },
      );
    } catch {
      setState({ step: "error", message: "We couldn't reach Sighted. Check your connection and try again." });
    }
  }

  function reset() {
    setPhoto(null);
    setState({ step: "pick" });
  }

  const hiddenInputs = (
    <>
      {/* capture="environment" opens the rear camera on phones */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={uploadInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </>
  );

  if (state.step === "pick") {
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <div className="text-6xl" aria-hidden>
          🔍
        </div>
        <p className="text-forest-800/80">Take a photo of an animal, or choose one from your library.</p>
        <button type="button" className="btn btn-primary w-full" onClick={() => cameraInput.current?.click()}>
          📸 Take a photo
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={() => uploadInput.current?.click()}>
          🖼️ Upload a photo
        </button>
        {hiddenInputs}
      </div>
    );
  }

  if (state.step === "loading") {
    return (
      <div className="card overflow-hidden">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Your photo" className="max-h-80 w-full object-cover opacity-70" />
        )}
        <div className="flex items-center justify-center gap-3 p-6 font-semibold text-forest-700">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700" />
          Identifying… this takes a few seconds
        </div>
      </div>
    );
  }

  if (state.step === "result") {
    const { result } = state;
    const info = CATEGORY_INFO[result.category];
    return (
      <div className="card overflow-hidden">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={result.commonName} className="max-h-80 w-full object-cover" />
        )}
        <div className="space-y-4 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full px-2 py-0.5 text-white" style={{ background: info.color }}>
                {info.emoji} {info.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 ${confidenceStyles[result.confidence]}`}>
                {result.confidence} confidence
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold">{result.commonName}</h2>
            {result.scientificName && <p className="italic text-bark-500">{result.scientificName}</p>}
          </div>
          {result.funFacts.length > 0 && (
            <div className="rounded-xl bg-forest-50 p-4">
              <h3 className="mb-2 font-bold">Fun facts</h3>
              <ul className="space-y-2">
                {result.funFacts.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span aria-hidden>🌱</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.confidence === "low" && (
            <p className="text-sm text-bark-500">
              Not quite sure about this one — you can correct the name before saving.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn btn-primary flex-1" onClick={() => setState({ step: "save", result })}>
              Save to my journal
            </button>
            <button type="button" className="btn btn-secondary flex-1" onClick={reset}>
              Try another photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === "save") {
    const { result } = state;
    return (
      <div className="card p-5">
        <h2 className="mb-4 text-xl font-extrabold">Save your sighting</h2>
        <SightingForm
          allowPhotoChange={false}
          newPhoto={photo ?? undefined}
          initial={{
            commonName: result.commonName,
            scientificName: result.scientificName,
            category: result.category,
            confidence: result.confidence,
            funFacts: result.funFacts,
          }}
        />
        <button type="button" className="btn mt-2 w-full text-bark-500" onClick={() => setState({ step: "result", result })}>
          Back
        </button>
      </div>
    );
  }

  // Friendly "no animal", limit and error screens
  const content = {
    "no-animal": { emoji: "🤔", title: "Hmm, we couldn't spot an animal" },
    limit: { emoji: "🌙", title: "You've used this month's free IDs" },
    error: { emoji: "🍂", title: "Something went wrong" },
  }[state.step];

  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <div className="text-6xl" aria-hidden>
        {content.emoji}
      </div>
      <h2 className="text-xl font-extrabold">{content.title}</h2>
      <p className="text-forest-800/80">{state.message}</p>
      {state.step === "limit" ? (
        <>
          <span className="rounded-full bg-sun-400 px-3 py-1 text-sm font-bold">Sighted Pro — coming soon</span>
          <Link href="/sightings/new" className="btn btn-secondary mt-2 w-full">
            Add a sighting manually
          </Link>
        </>
      ) : (
        <button type="button" className="btn btn-primary mt-2 w-full" onClick={reset}>
          Try another photo
        </button>
      )}
    </div>
  );
}

function limitMessage() {
  return "You've used all 5 free identifications this month. Sighted Pro with unlimited IDs is coming soon! Your free IDs reset on the 1st. You can still add sightings manually.";
}
