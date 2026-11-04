"use client";

import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateAvatar } from "@/app/actions/account";
import { Avatar } from "./Avatar";

/** Crops the photo to a centered square and shrinks it to 320×320. */
async function squareAvatar(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 320, 320);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Your profile picture, with buttons to change or remove it. */
export function AvatarUpload({
  userId,
  name,
  version,
  hasImage,
}: {
  userId: string;
  name: string;
  version: number;
  hasImage: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(image: string | null) {
    setBusy(true);
    setError(null);
    const result = await updateAvatar(image);
    if (result.error) setError(result.error);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative rounded-full ring-4 ring-white"
        aria-label="Change profile picture"
        disabled={busy}
      >
        <Avatar userId={userId} name={name} version={version} className="h-24 w-24" />
        <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-forest-700 text-white shadow ring-2 ring-white group-hover:bg-forest-600">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            await save(await squareAvatar(file));
          } catch {
            setError("That picture couldn't be opened. Please try another.");
          }
        }}
      />
      {hasImage && !busy && (
        <button
          type="button"
          onClick={() => save(null)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-bark-500 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove photo
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
