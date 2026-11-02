"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { sighting } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";
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
  // A data URL for a new photo, null to remove it, or undefined to keep the current one.
  photo: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(4_000_000)
    .nullable()
    .optional(),
});

export type SightingInput = z.input<typeof SightingInput>;

export async function saveSighting(input: SightingInput): Promise<{ error: string }> {
  const user = await requireUser();
  const parsed = SightingInput.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { id, photo, ...data } = parsed.data;
  const values = {
    ...data,
    scientificName: data.scientificName || null,
    notes: data.notes || null,
    ...(photo !== undefined ? { photo } : {}),
  };

  let savedId = id;
  if (id) {
    const updated = await db
      .update(sighting)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(sighting.id, id), eq(sighting.userId, user.id)))
      .returning({ id: sighting.id });
    if (updated.length === 0) return { error: "That sighting couldn't be found." };
  } else {
    const [created] = await db
      .insert(sighting)
      .values({ ...values, userId: user.id })
      .returning({ id: sighting.id });
    savedId = created.id;
  }

  revalidatePath("/", "layout");
  redirect(`/journal/${savedId}`);
}

export async function deleteSighting(id: string) {
  const user = await requireUser();
  await db.delete(sighting).where(and(eq(sighting.id, id), eq(sighting.userId, user.id)));
  revalidatePath("/", "layout");
  redirect("/journal");
}
