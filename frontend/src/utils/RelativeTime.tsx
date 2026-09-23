import { relativeTime } from "./formatDate";

export function RelativeTime({ iso }: { iso: string | null | undefined }) {
  return <time dateTime={iso || undefined}>{relativeTime(iso)}</time>;
}
