<script lang="ts" setup>
import type { Notification } from "@/domain/notifications";
import type {
  CalendarEventReminderNotificationPayload,
  CalendarMeetingReminderNotificationPayload,
  DirectMessageNotificationPayload,
  IssueAssignedNotificationPayload,
  IssueDueDateNotificationPayload,
  MentionNotificationPayload,
  MessageReactionNotificationPayload,
  ReplyNotificationPayload,
  ReplyReactionNotificationPayload,
} from "@/domain/notifications";
import MentionNotification from "./notifications/MentionNotification.vue";
import ReplyNotification from "./notifications/ReplyNotification.vue";
import MessageNotification from "./notifications/MessageNotification.vue";
import MessageReactionNotification from "./notifications/MessageReactionNotification.vue";
import DueDateNotification from "./notifications/DueDateNotification.vue";
import IssueAssignedNotification from "./notifications/IssueAssignedNotification.vue";
import CalendarMeetingReminderNotification from "./notifications/CalendarMeetingReminderNotification.vue";
import CalendarEventReminderNotification from "./notifications/CalendarEventReminderNotification.vue";

defineProps<{
  notification: Notification;
}>();

const emit = defineEmits<{
  select: [notification: Notification];
}>();

function notificationTypeLabel(n: Notification): string {
  const t = (n as { type?: unknown }).type;
  return typeof t === "string" ? t : "unknown";
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="flex:col-md p-4 border-b hover:bg-secondary transition-colors cursor-pointer w-full"
    :class="notification.seen ? 'opacity-80' : 'bg-secondary/10'"
    @click="emit('select', notification)"
    @keydown.enter.prevent="emit('select', notification)"
  >
    <MentionNotification
      v-if="notification.type === 'mention'"
      :payload="notification.payload as MentionNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <ReplyNotification
      v-else-if="notification.type === 'reply'"
      :payload="notification.payload as ReplyNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <MessageNotification
      v-else-if="notification.type === 'direct_message'"
      :payload="notification.payload as DirectMessageNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <DueDateNotification
      v-else-if="notification.type === 'issue_due_date'"
      :payload="notification.payload as IssueDueDateNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <IssueAssignedNotification
      v-else-if="notification.type === 'issue_assigned'"
      :payload="notification.payload as IssueAssignedNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <CalendarMeetingReminderNotification
      v-else-if="notification.type === 'calendar_meeting_reminder'"
      :payload="notification.payload as CalendarMeetingReminderNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <CalendarEventReminderNotification
      v-else-if="notification.type === 'calendar_event_reminder'"
      :payload="notification.payload as CalendarEventReminderNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <MessageReactionNotification
      v-else-if="notification.type === 'message_reaction'"
      kind="message_reaction"
      :payload="notification.payload as MessageReactionNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <MessageReactionNotification
      v-else-if="notification.type === 'reply_reaction'"
      kind="reply_reaction"
      :payload="notification.payload as ReplyReactionNotificationPayload"
      :createdAt="notification.createdAt"
    />
    <div v-else class="text-sm text-secondary-foreground">
      Unknown notification type: {{ notificationTypeLabel(notification) }}
    </div>
  </div>
</template>
