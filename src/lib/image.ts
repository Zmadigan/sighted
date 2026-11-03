/**
 * Browser-only helper: shrink a photo before uploading it.
 * Phone photos are often 5–10 MB; this turns them into ~200 KB JPEGs,
 * which is plenty for identification and keeps uploads fast outdoors.
 */
export async function compressImage(file: File, maxSize = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

/** Today's date as YYYY-MM-DD in the user's own time zone. */
export function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export type PhotoInfo = { date?: string; lat?: number; lng?: number };

/**
 * Reads when (and, if the phone recorded it, where) a photo was taken. Must run on the
 * original file, since resizing the photo removes this information. Never throws.
 */
export async function readPhotoInfo(file: File): Promise<PhotoInfo> {
  try {
    // Loaded only when needed (in the browser). Default options read the camera (EXIF) and
    // GPS sections, and add decimal latitude/longitude.
    const { default: exifr } = await import("exifr");
    const data = await exifr.parse(file);
    if (!data) return {};
    const info: PhotoInfo = {};
    const taken: unknown = data.DateTimeOriginal ?? data.CreateDate;
    if (taken instanceof Date && !Number.isNaN(taken.getTime()) && taken.getTime() <= Date.now() + 86_400_000) {
      const pad = (n: number) => String(n).padStart(2, "0");
      info.date = `${taken.getFullYear()}-${pad(taken.getMonth() + 1)}-${pad(taken.getDate())}`;
    }
    const { latitude: lat, longitude: lng } = data;
    if (typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng)) {
      info.lat = lat;
      info.lng = lng;
    }
    return info;
  } catch {
    return {};
  }
}
