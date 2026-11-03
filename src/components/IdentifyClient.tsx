"use client";

import { Camera, CloudRain, Crown, PartyPopper, ImageUp, LoaderCircle, MoonStar, ScanSearch, SearchX, Sprout } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Identification } from "@/lib/identify";
import { compressImage, readPhotoInfo, type PhotoInfo } from "@/lib/image";
import { BIRD_FOUND_EVENT } from "./BirdOfWeekCard";
import { CategoryBadge } from "./CategoryIcon";
import { SightingForm } from "./SightingForm";

type State =
  | { step: "pick" }
  | { step: "loading" }
  | { step: "result"; result: Extract<Identification, { foundAnimal: true }>; foundBirdOfWeek?: boolean }
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
  const [photoInfo, setPhotoInfo] = useState<PhotoInfo>({});
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    setState({ step: "loading" });
    let image: string;
    try {
      // Read when/where it was taken first: resizing the photo removes that information.
      setPhotoInfo(await readPhotoInfo(file));
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
      if (data.foundBirdOfWeek) window.dispatchEvent(new Event(BIRD_FOUND_EVENT));
      setState(
        result.foundAnimal
          ? { step: "result", result, foundBirdOfWeek: Boolean(data.foundBirdOfWeek) }
          : { step: "no-animal", message: result.message },
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
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
          <ScanSearch className="h-8 w-8" aria-hidden />
        </span>
        <p className="text-forest-800/80">Take a photo of an animal, or choose one from your library.</p>
        <button type="button" className="btn btn-primary w-full" onClick={() => cameraInput.current?.click()}>
          <Camera className="h-5 w-5" aria-hidden /> Take a photo
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={() => uploadInput.current?.click()}>
          <ImageUp className="h-5 w-5" aria-hidden /> Upload a photo
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
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
          Identifying… this takes a few seconds
        </div>
      </div>
    );
  }

  if (state.step === "result") {
    const { result } = state;
    return (
      <div className="card overflow-hidden">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={result.commonName} className="max-h-80 w-full object-cover" />
        )}
        {state.foundBirdOfWeek && (
          <div className="flex items-center gap-2 bg-sun-400 px-5 py-3 font-bold text-forest-900">
            <PartyPopper className="h-5 w-5 shrink-0" aria-hidden /> You found your Bird of the Week!
          </div>
        )}
        <div className="space-y-4 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <CategoryBadge category={result.category} />
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
                    <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
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
          photoInfo={photoInfo}
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
    "no-animal": { Icon: SearchX, title: "Hmm, we couldn't spot an animal" },
    limit: { Icon: MoonStar, title: "You've used this month's free IDs" },
    error: { Icon: CloudRain, title: "Something went wrong" },
  }[state.step];

  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sand-100 text-bark-700">
        <content.Icon className="h-8 w-8" aria-hidden />
      </span>
      <h2 className="text-xl font-extrabold">{content.title}</h2>
      <p className="text-forest-800/80">{state.message}</p>
      {state.step === "limit" ? (
        <>
          <Link href="/upgrade" className="btn btn-primary mt-2 w-full">
            <Crown className="h-5 w-5" aria-hidden /> Upgrade to Pro — $4.99/month
          </Link>
          <Link href="/sightings/new" className="btn btn-secondary w-full">
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
  return "You've used all 5 free identifications this month. Upgrade to Sighted Pro for unlimited IDs, or wait until your free IDs reset on the 1st. You can still add sightings manually.";
}
