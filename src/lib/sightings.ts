import "server-only";
import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sighting } from "@/db/schema";

/** Columns for lists — leaves out the (large) photo itself. */
const listColumns = {
  id: sighting.id,
  commonName: sighting.commonName,
  scientificName: sighting.scientificName,
  category: sighting.category,
  observedOn: sighting.observedOn,
  latitude: sighting.latitude,
  longitude: sighting.longitude,
  updatedAt: sighting.updatedAt,
  hasPhoto: sql<boolean>`${sighting.photo} is not null`,
};

export function photoUrl(s: { id: string; updatedAt: Date }) {
  return `/api/photos/${s.id}?v=${s.updatedAt.getTime()}`;
}

/** The user's sightings, newest first. `search` matches animal names and notes. */
export async function listSightings(userId: string, search?: string) {
  const term = search?.trim().slice(0, 100);
  const pattern = term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  return db
    .select(listColumns)
    .from(sighting)
    .where(
      and(
        eq(sighting.userId, userId),
        pattern
          ? or(
              ilike(sighting.commonName, pattern),
              ilike(sighting.scientificName, pattern),
              ilike(sighting.notes, pattern),
            )
          : undefined,
      ),
    )
    .orderBy(desc(sighting.observedOn), desc(sighting.createdAt));
}

export async function listMappedSightings(userId: string) {
  return db
    .select(listColumns)
    .from(sighting)
    .where(and(eq(sighting.userId, userId), isNotNull(sighting.latitude), isNotNull(sighting.longitude)));
}

export async function getSighting(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select({
      ...listColumns,
      confidence: sighting.confidence,
      funFacts: sighting.funFacts,
      notes: sighting.notes,
      isPrivate: sighting.isPrivate,
    })
    .from(sighting)
    .where(and(eq(sighting.id, id), eq(sighting.userId, userId)));
  return row ?? null;
}
