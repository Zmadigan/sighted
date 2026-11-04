import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Serves someone's profile picture, or a green circle with their initials if they haven't added one.
export async function GET(_request: Request, { params }: RouteContext<"/api/avatars/[id]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return new Response("Not found", { status: 404 });

  const [row] = await db.select({ name: user.name, image: user.image }).from(user).where(eq(user.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  // Short cache so a friend's new picture shows up within a few minutes (your own uses ?v= to update instantly).
  const cache = { "Cache-Control": "private, max-age=300" };
  const match = row.image && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(row.image);
  if (match) {
    return new Response(Buffer.from(match[2], "base64"), { headers: { "Content-Type": match[1], ...cache } });
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3b6f38"/><text x="32" y="33" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="26" font-weight="700" fill="#fff">${escapeXml(initials(row.name))}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", ...cache } });
}
