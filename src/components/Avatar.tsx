/** Someone's round profile picture (their initials if they haven't added a photo). */
export function Avatar({
  userId,
  name,
  version,
  className = "h-9 w-9",
}: {
  userId: string;
  name: string;
  /** Changes when the picture changes, so the browser shows the new one right away. */
  version?: string | number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/avatars/${encodeURIComponent(userId)}${version ? `?v=${version}` : ""}`}
      alt={name}
      loading="lazy"
      className={`shrink-0 rounded-full bg-forest-600 object-cover ${className}`}
    />
  );
}
