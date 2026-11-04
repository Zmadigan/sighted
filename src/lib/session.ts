import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "./auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Read the plan fresh from the database so upgrades apply immediately.
  const [row] = await db
    .select({ id: user.id, email: user.email, name: user.name, plan: user.plan, updatedAt: user.updatedAt })
    .from(user)
    .where(eq(user.id, session.user.id));
  return row ?? null;
}

/** Use in app pages and actions: sends logged-out visitors to the login page. */
export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}
