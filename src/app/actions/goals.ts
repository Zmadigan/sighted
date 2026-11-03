"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { goal } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";
import { MAX_GOALS } from "@/lib/progress";
import { requireUser } from "@/lib/session";

const GoalInput = z.object({
  category: z.enum(CATEGORIES).nullable(),
  period: z.enum(["month", "year"]),
  target: z.number().int().min(1).max(5000),
});

export async function addGoal(input: z.input<typeof GoalInput>): Promise<{ error?: string }> {
  const me = await requireUser();
  if (me.plan !== "pro") return { error: "Goals are a Sighted Pro feature." };
  const parsed = GoalInput.safeParse(input);
  if (!parsed.success) return { error: "Please choose a number between 1 and 5,000." };

  const [{ n }] = await db.select({ n: count() }).from(goal).where(eq(goal.userId, me.id));
  if (n >= MAX_GOALS) return { error: `You can have up to ${MAX_GOALS} goals. Remove one to add another.` };

  await db.insert(goal).values({ userId: me.id, ...parsed.data });
  revalidatePath("/life-list");
  return {};
}

export async function removeGoal(id: string) {
  const me = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.delete(goal).where(and(eq(goal.id, id), eq(goal.userId, me.id)));
  revalidatePath("/life-list");
}
