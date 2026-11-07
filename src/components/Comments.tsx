"use client";

import { LoaderCircle, SendHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { forwardRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "@/app/actions/comments";
import type { CommentView } from "@/lib/comments";
import { Avatar } from "./Avatar";
import { TimeAgo } from "./TimeAgo";

/**
 * Comments under a sighting. With `collapsed`, only the newest 2 show until you tap "View all".
 * The input is exposed through the ref so a "Comment" button can focus it.
 */
export const Comments = forwardRef<
  HTMLTextAreaElement,
  { sightingId: string; initial: CommentView[]; meId: string; collapsed?: boolean; onCountChange?: (n: number) => void }
>(function Comments({ sightingId, initial, meId, collapsed = false, onCountChange }, inputRef) {
  const [comments, setComments] = useState(initial);
  const [showAll, setShowAll] = useState(!collapsed);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  const update = (next: CommentView[]) => {
    setComments(next);
    onCountChange?.(next.length);
  };
  const shown = showAll ? comments : comments.slice(-2);

  function send() {
    const value = text.trim();
    if (!value || sending) return;
    setError(null);
    startSending(async () => {
      const result = await addComment(sightingId, value);
      if ("error" in result) return setError(result.error);
      update([...comments, result.comment]);
      setText("");
    });
  }

  return (
    <div className="space-y-2">
      {!showAll && comments.length > 2 && (
        <button type="button" onClick={() => setShowAll(true)} className="text-sm font-semibold text-bark-500">
          View all {comments.length} comments
        </button>
      )}
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((c) => (
            <li key={c.id} className="group flex gap-2">
              <Avatar userId={c.userId} name={c.userName} className="mt-0.5 h-7 w-7" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="whitespace-pre-wrap break-words">
                  {c.userId === meId ? (
                    <span className="mr-1.5 font-bold">{c.userName}</span>
                  ) : (
                    <Link href={`/friends/${c.userId}`} className="mr-1.5 font-bold">
                      {c.userName}
                    </Link>
                  )}
                  {c.text}
                </p>
                <p className="text-xs text-bark-500">
                  <TimeAgo iso={c.createdAt} />
                </p>
              </div>
              {c.canDelete && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this comment?")) return;
                    update(comments.filter((x) => x.id !== c.id));
                    await deleteComment(c.id);
                  }}
                  className="self-start rounded-full p-1.5 text-bark-500 hover:bg-sand-100 hover:text-red-700"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={500}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="field max-h-28 min-h-10 flex-1 resize-none py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white disabled:opacity-40"
          aria-label="Post comment"
        >
          {sending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <SendHorizontal className="h-4 w-4" aria-hidden />}
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
});
