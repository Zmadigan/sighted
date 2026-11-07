import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Post } from "@/components/Feed";
import { getPost } from "@/lib/feed";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sighting · Sighted" };

/** A single sighting with its reactions and comments (where notifications take you). */
export default async function PostPage({ params }: PageProps<"/post/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const post = await getPost(me.id, id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/friends" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Feed
      </Link>
      <Post post={post} meId={me.id} />
      {post.isMine && (
        <p className="mt-3 text-center text-sm">
          <Link href={`/journal/${post.id}`} className="font-semibold text-forest-600 underline">
            Open in your journal
          </Link>
        </p>
      )}
    </div>
  );
}
