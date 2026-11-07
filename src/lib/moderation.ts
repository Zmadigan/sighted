import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { friendRequest, friendship, notification, report, user, userBlock } from "@/db/schema";

export const REPORT_REASONS = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate or offensive",
  misleading: "Fake or misleading",
  other: "Something else",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

/** Everyone you've blocked, plus everyone who has blocked you. Neither side sees the other. */
export async function hiddenUserIds(meId: string): Promise<string[]> {
  const rows = await db
    .select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
    .from(userBlock)
    .where(or(eq(userBlock.blockerId, meId), eq(userBlock.blockedId, meId)));
  return [...new Set(rows.map((r) => (r.blockerId === meId ? r.blockedId : r.blockerId)))];
}

/** True if either person has blocked the other. */
export async function isBlockedEitherWay(a: string, b: string) {
  const [row] = await db
    .select({ id: userBlock.blockerId })
    .from(userBlock)
    .where(
      or(
        and(eq(userBlock.blockerId, a), eq(userBlock.blockedId, b)),
        and(eq(userBlock.blockerId, b), eq(userBlock.blockedId, a)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** SQL check: this user id is not blocked by / blocking `meId`. */
export function notBlockedWith(meId: string, column: unknown) {
  return sql`not exists (select 1 from ${userBlock} where (${userBlock.blockerId} = ${meId} and ${userBlock.blockedId} = ${column}) or (${userBlock.blockedId} = ${meId} and ${userBlock.blockerId} = ${column}))`;
}

/** Blocks someone: unfriends you both and clears requests and notifications between you. */
export async function blockUser(meId: string, otherId: string) {
  await db.insert(userBlock).values({ blockerId: meId, blockedId: otherId }).onConflictDoNothing();
  await Promise.all([
    db
      .delete(friendship)
      .where(
        or(
          and(eq(friendship.userId, meId), eq(friendship.friendId, otherId)),
          and(eq(friendship.userId, otherId), eq(friendship.friendId, meId)),
        ),
      ),
    db
      .delete(friendRequest)
      .where(
        or(
          and(eq(friendRequest.fromId, meId), eq(friendRequest.toId, otherId)),
          and(eq(friendRequest.fromId, otherId), eq(friendRequest.toId, meId)),
        ),
      ),
    db
      .delete(notification)
      .where(
        or(
          and(eq(notification.userId, meId), eq(notification.actorId, otherId)),
          and(eq(notification.userId, otherId), eq(notification.actorId, meId)),
        ),
      ),
  ]);
}

export async function unblockUser(meId: string, otherId: string) {
  await db.delete(userBlock).where(and(eq(userBlock.blockerId, meId), eq(userBlock.blockedId, otherId)));
}

export async function listBlocked(meId: string) {
  return db
    .select({ id: user.id, name: user.name })
    .from(userBlock)
    .innerJoin(user, eq(user.id, userBlock.blockedId))
    .where(eq(userBlock.blockerId, meId))
    .orderBy(user.name);
}

/** People who may review reports: emails listed in ADMIN_EMAILS (comma-separated). */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string) {
  return adminEmails().includes(email.toLowerCase());
}

export async function openReportCount() {
  return db.$count(report, eq(report.status, "open"));
}

export async function listReports(status: "open" | "closed") {
  const reporter = sql<string>`(select ${user.name} from ${user} where ${user.id} = ${report.reporterId})`;
  const target = sql<string>`(select ${user.name} from ${user} where ${user.id} = ${report.targetUserId})`;
  return db
    .select({
      id: report.id,
      kind: report.kind,
      reason: report.reason,
      details: report.details,
      snapshot: report.snapshot,
      status: report.status,
      createdAt: report.createdAt,
      sightingId: report.sightingId,
      commentId: report.commentId,
      reporterName: reporter,
      targetUserId: report.targetUserId,
      targetName: target,
    })
    .from(report)
    .where(status === "open" ? eq(report.status, "open") : inArray(report.status, ["removed", "dismissed"]))
    .orderBy(desc(report.createdAt))
    .limit(100);
}
