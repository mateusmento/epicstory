<script lang="ts" setup>
import type { INotification } from "@epicstory/contracts";
import {
  CalendarEventReminderNotification,
  CalendarMeetingReminderNotification,
  DueDateNotification,
  IssueAssignedNotification,
  MentionNotification,
  MessageNotification,
  MessageReactionNotification,
  ReplyNotification,
} from "./notifications";

defineProps<{
  notification: INotification;
  meId?: number | null;
}>();

const emit = defineEmits<{
  select: [notification: INotification];
}>();

function notificationTypeLabel(n: INotification): string {
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
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <ReplyNotification
      v-else-if="notification.type === 'reply'"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <MessageNotification
      v-else-if="notification.type === 'direct_message'"
      :payload="notification.payload"
      :created-at="notification.createdAt"
      :me-id="meId"
    />
    <DueDateNotification
      v-else-if="notification.type === 'issue_due_date'"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <IssueAssignedNotification
      v-else-if="notification.type === 'issue_assigned'"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <CalendarMeetingReminderNotification
      v-else-if="notification.type === 'calendar_meeting_reminder'"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <CalendarEventReminderNotification
      v-else-if="notification.type === 'calendar_event_reminder'"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <MessageReactionNotification
      v-else-if="notification.type === 'message_reaction'"
      kind="message_reaction"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <MessageReactionNotification
      v-else-if="notification.type === 'reply_reaction'"
      kind="reply_reaction"
      :payload="notification.payload"
      :createdAt="notification.createdAt"
    />
    <div v-else class="text-sm text-secondary-foreground">
      Unknown notification type: {{ notificationTypeLabel(notification) }}
    </div>
  </div>
</template>
