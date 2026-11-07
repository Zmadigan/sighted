"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/** "3h ago", filled in once the browser knows the current time (avoids server/browser mismatches). */
export function TimeAgo({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => setText(timeAgo(iso));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [iso]);
  return <span>{text}</span>;
}
