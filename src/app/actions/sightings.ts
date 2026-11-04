"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { sighting } from "@/db/schema";
import { achievementSnapshot } from "@/lib/achievements";
import { CATEGORIES } from "@/lib/categories";
import { deletePhotos, storePhoto } from "@/lib/photo-storage";
import { requireUser } from "@/lib/session";

const SightingInput = z.object({
  id: z.string().uuid().optional(),
  commonName: z.string().trim().min(1, "Please enter the animal's name.").max(200),
  scientificName: z.string().trim().max(200).optional().default(""),
  category: z.enum(CATEGORIES),
  confidence: z.enum(["high", "medium", "low"]).nullable().optional(),
  funFacts: z.array(z.string().max(500)).max(5).nullable().optional(),
  observedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a date."),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  notes: z.string().max(5000).optional().default(""),
  isPrivate: z.boolean().optional().default(false),
  // A data URL for a new photo, null to remove it, or undefined to keep the current one.
  photo: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(4_000_000)
    .nullable()
    .optional(),
});

export type SightingInput = z.input<typeof SightingInput>;

/** Validates and saves a sighting (new or edited) for the logged-in user. */
async function persistSighting(input: SightingInput): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  const parsed = SightingInput.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { id, photo, ...data } = parsed.data;

  // When editing, remember the old photo so it can be deleted if it's replaced or removed.
  let oldPhoto: string | null = null;
  if (id) {
    const [existing] = await db
      .select({ photo: sighting.photo })
      .from(sighting)
      .where(and(eq(sighting.id, id), eq(sighting.userId, user.id)));
    if (!existing) return { error: "That sighting couldn't be found." };
    oldPhoto = existing.photo;
  }

  // New photos go to photo storage; the database only keeps their address.
  const storedPhoto = photo ? await storePhoto(photo, "sightings") : photo;
  const values = {
    ...data,
    scientificName: data.scientificName || null,
    notes: data.notes || null,
    ...(storedPhoto !== undefined ? { photo: storedPhoto } : {}),
  };

  if (id) {
    const updated = await db
      .update(sighting)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(sighting.id, id), eq(sighting.userId, user.id)))
      .returning({ id: sighting.id });
    if (updated.length === 0) {
      await deletePhotos([storedPhoto]);
      return { error: "That sighting couldn't be found." };
    }
    if (photo !== undefined) await deletePhotos([oldPhoto]);
    return { id };
  }
  const [created] = await db
    .insert(sighting)
    .values({ ...values, userId: user.id })
    .returning({ id: sighting.id });
  return { id: created.id };
}

/** Save from the form, then open the saved sighting. */
export async function saveSighting(input: SightingInput): Promise<{ error: string }> {
  const user = await requireUser();
  const before = await achievementSnapshot(user.id);
  const result = await persistSighting(input);
  if ("error" in result) return result;
  revalidatePath("/", "layout");
  // Celebrate any badges or rank-up this sighting just unlocked.
  const after = await achievementSnapshot(user.id);
  const params = new URLSearchParams();
  const earned = after.badges.filter((id) => !before.badges.includes(id));
  if (earned.length) params.set("badges", earned.join(","));
  if (after.rank.level > before.rank.level) params.set("rankup", "1");
  redirect(`/journal/${result.id}${params.size ? `?${params}` : ""}`);
}

/** Upload a sighting that was saved on the phone while offline (stays on the current page). */
export async function uploadOfflineSighting(input: SightingInput) {
  const result = await persistSighting(input);
  if ("id" in result) revalidatePath("/", "layout");
  return result;
}

export async function deleteSighting(id: string) {
  const user = await requireUser();
  const deleted = await db
    .delete(sighting)
    .where(and(eq(sighting.id, id), eq(sighting.userId, user.id)))
    .returning({ photo: sighting.photo });
  await deletePhotos(deleted.map((d) => d.photo));
  revalidatePath("/", "layout");
  redirect("/journal");
}
