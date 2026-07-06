import { resolveCalendarReminderStartsInLabel } from "@/lib/notifications";
import type { INotification } from "@epicstory/contracts";

function formatCalendarOccurrenceSubtitle(occurrenceAt: string | null | undefined): string | undefined {
  if (occurrenceAt == null || occurrenceAt === "") return undefined;
  const d = new Date(occurrenceAt as string);
  if (Number.isNaN(d.getTime())) return undefined;
  return `Starts ${d.toLocaleString()}`;
}

export function getNotificationToastTitle(notification: INotification): string {
  switch (notification.type) {
    case "message_reaction": {
      const p = notification.payload;
      return `${p.reactor?.name ?? "Someone"} reacted ${p.emoji}`;
    }
    case "reply_reaction": {
      const p = notification.payload;
      return `${p.reactor?.name ?? "Someone"} reacted to your reply ${p.emoji}`;
    }
    case "mention":
      return `${notification.payload.sender.name ?? "Someone"} mentioned you`;
    case "reply":
      return `${notification.payload.sender.name ?? "Someone"} replied`;
    case "direct_message":
      return `${notification.payload.sender.name ?? "Someone"} sent you a direct message`;
    case "issue_due_date": {
      const p = notification.payload;
      return p.issueKey ? `${p.issueKey} · ${p.title}` : p.title || "Issue due date";
    }
    case "issue_assigned": {
      const p = notification.payload;
      return p.issueKey
        ? `${p.issuer.name ?? "Someone"} assigned you ${p.issueKey}`
        : `${p.issuer.name ?? "Someone"} assigned you an issue`;
    }
    case "calendar_meeting_reminder": {
      const p = notification.payload;
      const name = p.title || "Meeting";
      const when = resolveCalendarReminderStartsInLabel(p.notifyMinutesBefore, p.occurrenceAt);
      return `${name} is about to start ${when}`;
    }
    case "calendar_event_reminder": {
      const p = notification.payload;
      const name = p.title || "Event";
      const when = resolveCalendarReminderStartsInLabel(p.notifyMinutesBefore, p.occurrenceAt);
      return `${name} is about to start ${when}`;
    }
    case "sprint_completed": {
      const p = notification.payload;
      return `${p.sprintName} completed`;
    }
    default:
      return "New notification";
  }
}

export function getNotificationToastDescription(notification: INotification): string | undefined {
  switch (notification.type) {
    case "message_reaction":
    case "reply_reaction": {
      const payload = notification.payload;
      const excerpt = payload.messageExcerpt?.trim();
      if (excerpt) return `${payload.emoji ?? ""} ${excerpt}`.trim();
      const place = payload.channelName?.trim();
      return place ? `${payload.emoji ?? ""} · ${place}`.trim() : undefined;
    }
    case "mention":
    case "reply":
    case "direct_message":
      return notification.payload.message.displayContent;
    case "issue_due_date":
      return notification.payload.description;
    case "issue_assigned": {
      const p = notification.payload;
      return p.issueKey ? `${p.issueKey} · ${p.title}` : p.title;
    }
    case "calendar_meeting_reminder":
    case "calendar_event_reminder":
      return formatCalendarOccurrenceSubtitle(notification.payload.occurrenceAt);
    case "sprint_completed": {
      const p = notification.payload;
      return `${p.completedItemCount} of ${p.itemCount} issues done`;
    }
    default:
      return undefined;
  }
}
