"use server";

import { and, eq, gt, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comment, report, sighting, user } from "@/db/schema";
import { visibleSighting } from "@/lib/comments";
import { sendEmail } from "@/lib/email";
import { adminEmails, blockUser, isAdmin, REPORT_REASONS, unblockUser, type ReportReason } from "@/lib/moderation";
import { deletePhotos } from "@/lib/photo-storage";
import { requireUser } from "@/lib/session";

const isId = (id: string | undefined) => Boolean(id && /^[0-9a-f-]{36}$/i.test(id));
const MAX_REPORTS_PER_DAY = 20;

export type ReportInput = {
  kind: "post" | "comment" | "user";
  sightingId?: string;
  commentId?: string;
  userId?: string;
  reason: ReportReason;
  details?: string;
  alsoBlock?: boolean;
};

/** Reports a post, comment or person. The reported thing disappears for you right away. */
export async function submitReport(input: ReportInput): Promise<{ ok: true } | { error: string }> {
  const me = await requireUser();
  if (!(input.reason in REPORT_REASONS)) return { error: "Please pick a reason." };
  const details = input.details?.trim().slice(0, 1000) || null;

  const recent = await db.$count(
    report,
    and(eq(report.reporterId, me.id), gt(report.createdAt, new Date(Date.now() - 86_400_000))),
  );
  if (recent >= MAX_REPORTS_PER_DAY) return { error: "You've sent a lot of reports today. Please try again tomorrow." };

  let targetUserId: string;
  let snapshot: string;
  let sightingId: string | null = null;
  let commentId: string | null = null;

  if (input.kind === "post") {
    if (!isId(input.sightingId)) return { error: "That post isn't available." };
    const post = await visibleSighting(me.id, input.sightingId!);
    if (!post || post.ownerId === me.id) return { error: "That post isn't available." };
    targetUserId = post.ownerId;
    sightingId = post.id;
    snapshot = post.commonName;
  } else if (input.kind === "comment") {
    if (!isId(input.commentId)) return { error: "That comment isn't available." };
    const [row] = await db
      .select({ id: comment.id, userId: comment.userId, text: comment.text, sightingId: comment.sightingId })
      .from(comment)
      .where(eq(comment.id, input.commentId!));
    if (!row || row.userId === me.id || !(await visibleSighting(me.id, row.sightingId))) {
      return { error: "That comment isn't available." };
    }
    targetUserId = row.userId;
    sightingId = row.sightingId;
    commentId = row.id;
    snapshot = row.text;
  } else {
    const [row] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, input.userId ?? ""));
    if (!row || row.id === me.id) return { error: "That person isn't available." };
    targetUserId = row.id;
    snapshot = row.name;
  }

  await db.insert(report).values({
    reporterId: me.id,
    targetUserId,
    kind: input.kind,
    sightingId,
    commentId,
    reason: input.reason,
    details,
    snapshot,
  });
  if (input.alsoBlock) await blockUser(me.id, targetUserId);

  // Let the admins know so it can be reviewed quickly (Apple expects action within 24 hours).
  const site = process.env.BETTER_AUTH_URL ?? "https://sightedwildlife.com";
  const what = input.kind === "user" ? `the person "${snapshot}"` : `a ${input.kind}: "${snapshot.slice(0, 200)}"`;
  const text = `${me.name} reported ${what}\nReason: ${REPORT_REASONS[input.reason]}${details ? `\nDetails: ${details}` : ""}\n\nReview it: ${site}/admin/reports`;
  for (const to of adminEmails()) {
    try {
      await sendEmail({
        to,
        subject: "New report on Sighted",
        text,
        html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>`,
      });
    } catch (error) {
      console.error("Couldn't email report", error);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function block(userId: string) {
  const me = await requireUser();
  if (userId === me.id) return;
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!row) return;
  await blockUser(me.id, userId);
  revalidatePath("/", "layout");
}

export async function unblock(userId: string) {
  const me = await requireUser();
  await unblockUser(me.id, userId);
  revalidatePath("/account");
}

/** Admins only: remove the reported post/comment, or dismiss the report. */
export async function resolveReport(reportId: string, action: "remove" | "dismiss") {
  const me = await requireUser();
  if (!isAdmin(me.email) || !isId(reportId)) return;
  const [row] = await db.select().from(report).where(eq(report.id, reportId));
  if (!row) return;

  // Close this report, plus any other open reports about the same thing. (Done before deleting,
  // because deleting the content clears the reports' links to it.)
  const sameThing =
    row.kind === "comment" && row.commentId
      ? eq(report.commentId, row.commentId)
      : row.kind === "post" && row.sightingId
        ? and(eq(report.kind, "post"), eq(report.sightingId, row.sightingId))
        : undefined;
  await db
    .update(report)
    .set({ status: action === "remove" ? "removed" : "dismissed", resolvedAt: new Date() })
    .where(and(eq(report.status, "open"), sameThing ? or(eq(report.id, row.id), sameThing) : eq(report.id, row.id)));

  if (action === "remove") {
    if (row.kind === "comment" && row.commentId) {
      await db.delete(comment).where(eq(comment.id, row.commentId));
    } else if (row.kind === "post" && row.sightingId) {
      const deleted = await db
        .delete(sighting)
        .where(eq(sighting.id, row.sightingId))
        .returning({ photo: sighting.photo });
      await deletePhotos(deleted.map((d) => d.photo));
    }
  }
  revalidatePath("/", "layout");
}

