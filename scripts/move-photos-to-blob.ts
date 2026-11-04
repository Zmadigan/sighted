/**
 * One-time move: copies photos that are still stored inside the database (as data URLs) into the
 * private Vercel Blob store, then replaces them in the database with their Blob address.
 * Safe to run again: photos that were already moved are skipped.
 *
 *   npx tsx scripts/move-photos-to-blob.ts
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { and, eq, like } from "drizzle-orm";
import { db } from "../src/db";
import { sighting, user } from "../src/db/schema";

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function upload(dataUrl: string, folder: string) {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return null;
  const blob = await put(`${folder}/${randomUUID()}.${EXT[match[1]]}`, Buffer.from(match[2], "base64"), {
    access: "private",
    contentType: match[1],
    addRandomSuffix: false,
  });
  return blob.url;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing from .env.local");

  const sightings = await db.select({ id: sighting.id, photo: sighting.photo }).from(sighting).where(like(sighting.photo, "data:%"));
  let moved = 0;
  for (const s of sightings) {
    const url = await upload(s.photo!, "sightings");
    if (!url) continue;
    // Only replace it if the photo hasn't changed meanwhile. updatedAt is left alone (same picture).
    await db.update(sighting).set({ photo: url }).where(and(eq(sighting.id, s.id), eq(sighting.photo, s.photo!)));
    moved++;
  }
  console.log(`✓ Sighting photos moved: ${moved} of ${sightings.length}`);

  const avatars = await db.select({ id: user.id, image: user.image }).from(user).where(like(user.image, "data:%"));
  let movedAvatars = 0;
  for (const u of avatars) {
    const url = await upload(u.image!, "avatars");
    if (!url) continue;
    await db.update(user).set({ image: url }).where(and(eq(user.id, u.id), eq(user.image, u.image!)));
    movedAvatars++;
  }
  console.log(`✓ Profile pictures moved: ${movedAvatars} of ${avatars.length}`);
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
