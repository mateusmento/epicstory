import { resolveCalendarReminderStartsInLabel } from "./event-starts-in";
import type {
  MessageReactionNotificationPayload,
  Notification,
  ReplyReactionNotificationPayload,
} from "./types";

function formatCalendarOccurrenceSubtitle(occurrenceAt: unknown): string | undefined {
  if (occurrenceAt == null || occurrenceAt === "") return undefined;
  const d = new Date(occurrenceAt as string);
  if (Number.isNaN(d.getTime())) return undefined;
  return `Starts ${d.toLocaleString()}`;
}

export function getNotificationToastTitle(notification: Notification): string {
  if (notification.type === "message_reaction") {
    const p = notification.payload as MessageReactionNotificationPayload;
    return `${p.reactor?.name ?? "Someone"} reacted ${p.emoji}`;
  }
  if (notification.type === "reply_reaction") {
    const p = notification.payload as ReplyReactionNotificationPayload;
    return `${p.reactor?.name ?? "Someone"} reacted to your reply ${p.emoji}`;
  }
  const p = notification.payload;
  switch (p.type) {
    case "mention":
      return `${p.sender.name ?? "Someone"} mentioned you`;
    case "reply":
      return `${p.sender.name ?? "Someone"} replied`;
    case "direct_message":
      return `${p.sender.name ?? "Someone"} sent you a direct message`;
    case "issue_due_date":
      return p.issueKey ? `${p.issueKey} · ${p.title}` : p.title || "Issue due date";
    case "issue_assigned":
      return p.issueKey
        ? `${p.issuer.name ?? "Someone"} assigned you ${p.issueKey}`
        : `${p.issuer.name ?? "Someone"} assigned you an issue`;
    case "calendar_meeting_reminder": {
      const name = p.title || "Meeting";
      const when = resolveCalendarReminderStartsInLabel(p.notifyMinutesBefore, p.occurrenceAt);
      return `${name} is about to start ${when}`;
    }
    case "calendar_event_reminder": {
      const name = p.title || "Event";
      const when = resolveCalendarReminderStartsInLabel(p.notifyMinutesBefore, p.occurrenceAt);
      return `${name} is about to start ${when}`;
    }
    default:
      return "New notification";
  }
}

export function getNotificationToastDescription(notification: Notification): string | undefined {
  if (notification.type === "message_reaction" || notification.type === "reply_reaction") {
    const p = notification.payload as MessageReactionNotificationPayload | ReplyReactionNotificationPayload;
    const excerpt = p.messageExcerpt?.trim();
    if (excerpt) return `${p.emoji ?? ""} ${excerpt}`.trim();
    const place = p.channelName?.trim();
    return place ? `${p.emoji ?? ""} · ${place}`.trim() : undefined;
  }
  const p = notification.payload;

  switch (p.type) {
    case "mention":
    case "reply":
    case "direct_message":
      return p.message.displayContent;
    case "issue_due_date":
      return p.description;
    case "issue_assigned": {
      return p.issueKey ? `${p.issueKey} · ${p.title}` : p.title;
    }
    case "calendar_meeting_reminder":
      return formatCalendarOccurrenceSubtitle(p.occurrenceAt);
    case "calendar_event_reminder":
      return formatCalendarOccurrenceSubtitle(p.occurrenceAt);
    default:
      return undefined;
  }
}
