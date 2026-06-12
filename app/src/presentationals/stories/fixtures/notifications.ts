import type {
  CalendarEventReminderNotificationPayload,
  CalendarMeetingReminderNotificationPayload,
  DirectMessageNotificationPayload,
  IChannel,
  IMessage,
  INotification,
  IReply,
  IssueAssignedNotificationPayload,
  IssueDueDateNotificationPayload,
  MentionNotificationPayload,
  MessageReactionNotificationPayload,
  ReplyNotificationPayload,
  ReplyReactionNotificationPayload,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { storyIssueKeys } from "./issues";
import { storyUsers } from "./users";

const nowIso = "2026-06-10T20:00:00.000Z";

function textDoc(text: string): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

const directChannel: IChannel = {
  id: 77,
  name: storyUsers.daiana.name,
  type: "direct",
  workspaceId: 1,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  unreadMessagesCount: 0,
  meeting: null,
  peers: [storyUsers.sean, storyUsers.daiana],
  directPeer: storyUsers.daiana,
};

const groupChannel: IChannel = {
  id: 91,
  name: "epicstory-product",
  type: "group",
  workspaceId: 1,
  createdAt: new Date("2026-01-05T12:00:00.000Z"),
  unreadMessagesCount: 0,
  meeting: null,
  peers: [storyUsers.sean, storyUsers.daiana, storyUsers.jean],
};

const baseMessage: IMessage = {
  id: 420,
  content: textDoc("Can someone review the issue workflow copy?"),
  displayContent: "Can someone review the issue workflow copy?",
  sentAt: new Date("2026-06-10T19:45:00.000Z"),
  senderId: storyUsers.daiana.id,
  sender: storyUsers.daiana,
  channelId: groupChannel.id,
  channel: groupChannel,
  repliesCount: 1,
  repliers: [],
  reactions: [],
};

const baseReply: IReply = {
  id: 99,
  content: textDoc("Looks great, just tweak the due date hint."),
  displayContent: "Looks great, just tweak the due date hint.",
  sentAt: new Date("2026-06-10T19:50:00.000Z"),
  senderId: storyUsers.jean.id,
  sender: storyUsers.jean,
  channelId: groupChannel.id,
  channel: groupChannel,
  messageId: baseMessage.id,
  repliesCount: 0,
  repliers: [],
  reactions: [],
};

const mentionPayload: MentionNotificationPayload = {
  channel: groupChannel,
  message: baseMessage,
  sender: storyUsers.daiana,
  mentionedUsers: [storyUsers.sean],
};

const replyPayload: ReplyNotificationPayload = {
  reply: baseReply,
  message: baseMessage,
  channel: groupChannel,
  sender: storyUsers.jean,
};

const directMessagePayload: DirectMessageNotificationPayload = {
  message: {
    ...baseMessage,
    id: 421,
    displayContent: "Could you check the branch naming docs?",
    sender: storyUsers.daiana,
    senderId: storyUsers.daiana.id,
    channel: directChannel,
    channelId: directChannel.id,
  },
  channel: directChannel,
  sender: storyUsers.daiana,
};

const issueDueDatePayload: IssueDueDateNotificationPayload = {
  title: "Align Storybook wiring for issue dialogs",
  description: "Ensure stories reflect issue container contracts",
  issueId: 42,
  issueKey: storyIssueKeys.backlog,
  projectId: 1,
  workspaceId: 1,
  dueDate: "2026-06-12T17:00:00.000Z",
};

const issueAssignedPayload: IssueAssignedNotificationPayload = {
  title: "Create meeting component stories",
  description: "Add harnesses for controls and grid layout",
  issueId: 108,
  issueKey: storyIssueKeys.inProgress,
  projectId: 1,
  issuer: storyUsers.daiana,
};

const calendarMeetingPayload: CalendarMeetingReminderNotificationPayload = {
  calendarEventId: "meeting-1",
  occurrenceAt: "2026-06-10T21:00:00.000Z",
  meetingId: 55,
  channelId: 120,
  title: "Weekly Epicstory design sync",
  notifyMinutesBefore: 10,
  description: "Review inbox and issue notification polish",
};

const calendarEventPayload: CalendarEventReminderNotificationPayload = {
  calendarEventId: "event-1",
  occurrenceAt: "2026-06-11T14:30:00.000Z",
  channelId: 120,
  title: "Roadmap planning",
  notifyMinutesBefore: 30,
  description: "Finalize milestones for beta",
};

const messageReactionPayload: MessageReactionNotificationPayload = {
  messageId: baseMessage.id,
  channelId: groupChannel.id,
  emoji: "🔥",
  reactorUserId: storyUsers.jean.id,
  reactor: storyUsers.jean,
  channelName: "#epicstory-product",
  messageExcerpt: "Can someone review the issue workflow copy?",
};

const replyReactionPayload: ReplyReactionNotificationPayload = {
  replyId: baseReply.id,
  channelId: groupChannel.id,
  emoji: "✅",
  reactorUserId: storyUsers.daiana.id,
  reactor: storyUsers.daiana,
  channelName: "#epicstory-product",
  messageExcerpt: "Looks great, just tweak the due date hint.",
};

export const storyNotifications = {
  mention: {
    id: "notif-mention",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "mention",
    payload: mentionPayload,
  },
  reply: {
    id: "notif-reply",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "reply",
    payload: replyPayload,
  },
  directMessage: {
    id: "notif-direct-message",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "direct_message",
    payload: directMessagePayload,
  },
  issueDueDate: {
    id: "notif-due-date",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: true,
    type: "issue_due_date",
    payload: issueDueDatePayload,
  },
  issueAssigned: {
    id: "notif-assigned",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "issue_assigned",
    payload: issueAssignedPayload,
  },
  calendarMeetingReminder: {
    id: "notif-meeting-reminder",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "calendar_meeting_reminder",
    payload: calendarMeetingPayload,
  },
  calendarEventReminder: {
    id: "notif-event-reminder",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: true,
    type: "calendar_event_reminder",
    payload: calendarEventPayload,
  },
  messageReaction: {
    id: "notif-message-reaction",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "message_reaction",
    payload: messageReactionPayload,
  },
  replyReaction: {
    id: "notif-reply-reaction",
    userId: storyUsers.sean.id,
    createdAt: nowIso,
    seen: false,
    type: "reply_reaction",
    payload: replyReactionPayload,
  },
} satisfies Record<string, INotification>;

export const storyNotificationList: INotification[] = [
  storyNotifications.mention,
  storyNotifications.reply,
  storyNotifications.directMessage,
  storyNotifications.issueDueDate,
  storyNotifications.issueAssigned,
  storyNotifications.calendarMeetingReminder,
  storyNotifications.calendarEventReminder,
  storyNotifications.messageReaction,
  storyNotifications.replyReaction,
];
