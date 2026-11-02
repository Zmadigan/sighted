import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { usage } from "@/db/schema";

export const FREE_MONTHLY_LIMIT = 5;

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
