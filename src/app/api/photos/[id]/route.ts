import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sighting } from "@/db/schema";
import { areFriends } from "@/lib/friends";
import { getCurrentUser } from "@/lib/session";

// Serves a sighting's photo as a normal image file (only to its owner and their friends).
export async function GET(_request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ photo: sighting.photo, ownerId: sighting.userId })
    .from(sighting)
    .where(eq(sighting.id, id));
  if (!row || (row.ownerId !== user.id && !(await areFriends(user.id, row.ownerId)))) {
    return new Response("Not found", { status: 404 });
  }

  const match = row?.photo && /^data:(image\/[a-z]+);base64,(.+)$/.exec(row.photo);
  if (!match) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      // Private to this browser; cached for a day (URLs include ?v= when photos change)
      "Cache-Control": "private, max-age=86400",
    },
  });
}
