import type { User } from "@/domain/auth";
import type { IChannel } from "@/domain/channels";
import { resolveCalendarReminderStartsInLabel } from "@/domain/notifications/event-starts-in";
import type { Notification } from "@/domain/notifications/types/notification.types";

function channelLabel(channel: IChannel, opts?: { thread?: boolean }): string {
  if (opts?.thread) return "thread";
  if (channel.type === "multi-direct") {
    return channel.peers.map((p: User) => p.name).join(", ") || "Group";
  }
  if (channel.type === "direct") return "Direct message";
  return "#" + channel.name;
}

function messageChannelLabel(payload: { channel: IChannel; message?: string; reply?: unknown }): string {
  const thread = Boolean(payload.message && payload.reply);
  return channelLabel(payload.channel, { thread });
}

function formatCalendarOccurrenceSubtitle(occurrenceAt: unknown): string | undefined {
  if (occurrenceAt == null || occurrenceAt === "") return undefined;
  const d = new Date(occurrenceAt as string);
  if (Number.isNaN(d.getTime())) return undefined;
  return `Starts ${d.toLocaleString()}`;
}

export function getNotificationToastTitle(notification: Notification): string {
  const p = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case "mention":
      return `${(p.sender as User)?.name ?? "Someone"} mentioned you`;
    case "reply":
      return `${(p.sender as User)?.name ?? "Someone"} replied`;
    case "direct_message":
      return `${(p.sender as User)?.name ?? "Someone"}`;
    case "issue_due_date":
      return (p.title as string) || "Issue due date";
    case "issue_assigned":
      return `${(p.issuer as User)?.name ?? "Someone"} assigned you an issue`;
    case "calendar_meeting_reminder": {
      const name = (p.title as string) || "Meeting";
      const when = resolveCalendarReminderStartsInLabel(
        p.notifyMinutesBefore as number | undefined,
        p.occurrenceAt as string | undefined,
      );
      return `${name} is about to start ${when}`;
    }
    case "calendar_event_reminder": {
      const name = (p.title as string) || "Event";
      const when = resolveCalendarReminderStartsInLabel(
        p.notifyMinutesBefore as number | undefined,
        p.occurrenceAt as string | undefined,
      );
      return `${name} is about to start ${when}`;
    }
    default:
      return "New notification";
  }
}

export function getNotificationToastDescription(notification: Notification): string | undefined {
  const p = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case "mention":
    case "reply":
    case "direct_message":
      return messageChannelLabel(p as { channel: IChannel; message?: string; reply?: unknown });
    case "issue_due_date":
      return (p.description as string) || undefined;
    case "issue_assigned": {
      return p.title as string | undefined;
    }
    case "calendar_meeting_reminder":
      return formatCalendarOccurrenceSubtitle(p.occurrenceAt);
    case "calendar_event_reminder":
      return formatCalendarOccurrenceSubtitle(p.occurrenceAt);
    default:
      return undefined;
  }
}
