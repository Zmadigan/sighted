import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sighting } from "@/db/schema";
import { areFriends } from "@/lib/friends";
import { photoResponse } from "@/lib/photo-storage";
import { getCurrentUser } from "@/lib/session";

// Serves a sighting's photo as a normal image file (to its owner, and to friends unless it's private).
export async function GET(_request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ photo: sighting.photo, ownerId: sighting.userId, isPrivate: sighting.isPrivate })
    .from(sighting)
    .where(eq(sighting.id, id));
  const isOwner = row?.ownerId === user.id;
  if (!row || (!isOwner && (row.isPrivate || !(await areFriends(user.id, row.ownerId))))) {
    return new Response("Not found", { status: 404 });
  }

  // Private to this browser; cached for a day (URLs include ?v= when photos change)
  const response = await photoResponse(row.photo, "private, max-age=86400");
  return response ?? new Response("Not found", { status: 404 });
}
