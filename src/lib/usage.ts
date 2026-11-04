import "server-only";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { networkUsage, usage } from "@/db/schema";

export const FREE_MONTHLY_LIMIT = 3;
/** Free IDs shared by all free accounts on one internet connection per month (about 10 accounts' worth). */
export const FREE_NETWORK_MONTHLY_LIMIT = 30;

/** Calendar month key in UTC, e.g. "2026-11". */
export function currentMonth(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

export async function getMonthlyUsage(userId: string) {
  const [row] = await db
    .select({ count: usage.identifications })
    .from(usage)
    .where(and(eq(usage.userId, userId), eq(usage.month, currentMonth())));
  return row?.count ?? 0;
}

export async function recordIdentification(userId: string) {
  await db
    .insert(usage)
    .values({ userId, month: currentMonth(), identifications: 1 })
    .onConflictDoUpdate({
      target: [usage.userId, usage.month],
      set: { identifications: sql`${usage.identifications} + 1` },
    });
}

/** How many IDs are left this month (null = unlimited). */
export async function remainingIdentifications(userId: string, plan: string) {
  if (plan === "pro") return null;
  return Math.max(0, FREE_MONTHLY_LIMIT - (await getMonthlyUsage(userId)));
}

/** The visitor's IP, hashed with the app secret so the raw address is never stored. */
export function networkKey(headers: Headers) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET}:${ip}`).digest("hex").slice(0, 32);
}

export async function networkUsageThisMonth(ipHash: string) {
  const [row] = await db
    .select({ count: networkUsage.identifications })
    .from(networkUsage)
    .where(and(eq(networkUsage.ipHash, ipHash), eq(networkUsage.month, currentMonth())));
  return row?.count ?? 0;
}

export async function recordNetworkIdentification(ipHash: string) {
  await db
    .insert(networkUsage)
    .values({ ipHash, month: currentMonth(), identifications: 1 })
    .onConflictDoUpdate({
      target: [networkUsage.ipHash, networkUsage.month],
      set: { identifications: sql`${networkUsage.identifications} + 1` },
    });
}
