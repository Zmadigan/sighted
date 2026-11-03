"use client";

import { Binoculars, CircleCheck, ExternalLink, Flame, Lightbulb, LoaderCircle, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { loadBirdOfWeek } from "@/app/actions/bird-of-week";
import type { BirdOfWeek } from "@/lib/bird-of-week";

type State = BirdOfWeek | { status: "error" } | { status: "loading" };

/** Fired by the Identify screen when a photo ID completes the challenge, so this card refreshes. */
export const BIRD_FOUND_EVENT = "sighted:bird-of-week-found";

function currentPosition() {
  return new Promise<{ lat: number; lng: number } | undefined>((resolve) => {
    if (!("geolocation" in navigator)) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 10_000, maximumAge: 60 * 60 * 1000 },
    );
  });
}

export function BirdOfWeekCard() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (askLocation: boolean) => {
    // Already have this week's bird? Then no need to ask for location at all.
    const peek = await loadBirdOfWeek("peek");
    if (peek.status !== "needs-location" || !askLocation) return setState(peek);
    setState(await loadBirdOfWeek("assign", await currentPosition()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBirdOfWeek("peek").then(async (peek) => {
      if (cancelled) return;
      if (peek.status !== "needs-location") return setState(peek);
      const result = await loadBirdOfWeek("assign", await currentPosition());
      if (!cancelled) setState(result);
    });
    const onFound = () => load(false);
    window.addEventListener(BIRD_FOUND_EVENT, onFound);
    return () => {
      cancelled = true;
      window.removeEventListener(BIRD_FOUND_EVENT, onFound);
    };
  }, [load]);

  return (
    <section className="card mb-4 overflow-hidden">
      <div className="flex items-center gap-2 bg-forest-700 px-4 py-2.5 text-white">
        <Binoculars className="h-5 w-5" aria-hidden />
        <h2 className="font-bold">Bird of the Week</h2>
        <span className="ml-auto text-xs text-forest-100">New bird every Monday</span>
      </div>
      <div className="p-4">
        {state.status === "loading" && (
          <p className="flex items-center gap-2 text-sm text-bark-500">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Finding a bird near you…
          </p>
        )}

        {state.status === "needs-location" && (
          <div className="space-y-2 text-sm">
            <p className="text-forest-800/80">
              Share your location to get a bird you can find near you this week. We only use your rough area (about
              100 km), never your exact spot.
            </p>
            <button type="button" className="btn btn-secondary py-2" onClick={() => load(true)}>
              <MapPin className="h-4 w-4" aria-hidden /> Use my location
            </button>
          </div>
        )}

        {state.status === "no-bird" && (
          <p className="text-sm text-forest-800/80">
            We couldn&apos;t find a good bird for your area this week. Check back next Monday!
          </p>
        )}

        {state.status === "error" && (
          <p className="text-sm text-forest-800/80">We couldn&apos;t load this week&apos;s bird. Please try again later.</p>
        )}

        {state.status === "ok" && (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-extrabold leading-tight">{state.commonName}</p>
                <p className="text-sm italic text-bark-500">{state.scientificName}</p>
              </div>
              {state.found ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest-600 px-2.5 py-1 text-xs font-bold text-white">
                  <CircleCheck className="h-4 w-4" aria-hidden /> Found it!
                </span>
              ) : (
                state.streak > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sun-400/30 px-2.5 py-1 text-xs font-bold text-bark-700">
                    <Flame className="h-4 w-4" aria-hidden /> {state.streak}-week streak
                  </span>
                )
              )}
            </div>

            {state.tip && (
              <p className="flex items-start gap-1.5 rounded-xl bg-forest-50 p-3 text-sm text-forest-800">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
                <span>{state.tip}</span>
              </p>
            )}

            {state.found ? (
              <p className="text-sm font-semibold text-forest-700">
                {state.streak > 1 ? `${state.streak} weeks in a row — keep it going!` : "Nice spotting! A new bird arrives Monday."}
              </p>
            ) : (
              <p className="text-sm text-forest-800/80">Snap a photo of it below to complete this week&apos;s challenge.</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 text-xs text-bark-500">
              <a
                href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(state.scientificName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-forest-600"
              >
                What does it look like? <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              {state.regionName && (
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> {state.regionName}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
