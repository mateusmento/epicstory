import { formatDistanceToNow, isValid } from "date-fns";

export function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}
