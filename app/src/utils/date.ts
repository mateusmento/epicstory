import { formatDistanceToNow, isValid } from "date-fns";

export function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? date : null;
}
