import "server-only";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";

/**
 * Photos (sightings and profile pictures) live in a private Vercel Blob store, not in the database.
 * The database keeps only the photo's Blob URL. Older photos may still be stored inline as a
 * "data:image/...;base64," URL, so everything here handles both.
 *
 * Private means nobody can open a photo by its Blob URL. Photos are only served through
 * /api/photos and /api/avatars, which check who's asking first.
 */

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isBlobUrl(value: string | null | undefined): value is string {
  return Boolean(value?.startsWith("https://"));
}

/** Uploads a data-URL photo and returns its Blob URL (or keeps the data URL if Blob isn't set up, e.g. locally). */
export async function storePhoto(dataUrl: string, folder: "sightings" | "avatars") {
  const match = DATA_URL.exec(dataUrl);
  if (!match || !blobConfigured()) return dataUrl;
  const [, contentType, base64] = match;
  const blob = await put(`${folder}/${randomUUID()}.${EXTENSIONS[contentType]}`, Buffer.from(base64, "base64"), {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}

/** Deletes stored photos (ignores data URLs and empty values). Never throws. */
export async function deletePhotos(values: (string | null | undefined)[]) {
  const urls = values.filter(isBlobUrl);
  if (urls.length === 0) return;
  try {
    await del(urls);
  } catch (error) {
    console.error("Couldn't delete photos from Blob storage", error);
  }
}

/** Turns a stored photo (Blob URL or data URL) into an image response, or null if there isn't one. */
export async function photoResponse(value: string | null | undefined, cacheControl: string) {
  if (!value) return null;
  const inline = DATA_URL.exec(value);
  if (inline) {
    return new Response(Buffer.from(inline[2], "base64"), {
      headers: { "Content-Type": inline[1], "Cache-Control": cacheControl },
    });
  }
  if (!isBlobUrl(value)) return null;
  const result = await get(value, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream, {
    headers: { "Content-Type": result.blob.contentType, "Cache-Control": cacheControl },
  });
}
