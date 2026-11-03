"use server";

import { z } from "zod";
import { getBirdOfWeek, type BirdOfWeek } from "@/lib/bird-of-week";
import { requireUser } from "@/lib/session";

const Location = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

/**
 * Loads this week's bird for the logged-in user.
 * `step: "peek"` only returns a bird already assigned this week (no location needed);
 * `step: "assign"` uses the given location, or falls back to the user's last sighting.
 */
export async function loadBirdOfWeek(
  step: "peek" | "assign",
  location?: { lat: number; lng: number },
): Promise<BirdOfWeek | { status: "error" }> {
  const me = await requireUser();
  const loc = location ? Location.safeParse(location) : null;
  try {
    return await getBirdOfWeek(me.id, loc?.success ? loc.data : undefined, { useLastSighting: step === "assign" });
  } catch (error) {
    console.error("Bird of the Week failed", error);
    return { status: "error" };
  }
}
