import { formatDistanceToNow } from "date-fns";

export function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
