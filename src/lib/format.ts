/** "2026-05-14" -> "May 14, 2026" (dates are stored without a time zone). */
export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", opts);
}
