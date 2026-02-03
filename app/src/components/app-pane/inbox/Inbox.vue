<script lang="ts" setup>
import { Icon } from "@/design-system/icons";
import { useNotifications } from "@/domain/notifications";
import type {
  MentionNotificationPayload,
  ReplyNotificationPayload,
  IssueDueDateNotificationPayload,
} from "@/domain/notifications/types/notification.types";
import MentionNotification from "./notifications/MentionNotification.vue";
import ReplyNotification from "./notifications/ReplyNotification.vue";
import DueDateNotification from "./notifications/DueDateNotification.vue";

const { notifications } = useNotifications({ limit: 100 });
</script>

<template>
  <div class="flex:col w-96 h-full">
    <div class="flex:row-md flex:center-y p-4 border-b">
      <Icon name="oi-inbox" />
      <div class="text-lg font-semibold">Inbox</div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="notifications.length === 0" class="flex:col-md flex:center p-8 text-center">
        <Icon name="oi-inbox" class="text-4xl text-secondary-foreground/50" />
        <div class="text-sm text-secondary-foreground">No notifications yet</div>
      </div>

      <div v-else class="flex:col">
        <div v-for="notification in notifications" :key="notification.id"
          class="flex:col-md p-4 border-b hover:bg-secondary transition-colors">
          <MentionNotification v-if="notification.type === 'mention'"
            :payload="notification.payload as MentionNotificationPayload" :createdAt="notification.createdAt" />
          <ReplyNotification v-else-if="notification.type === 'reply'"
            :payload="notification.payload as ReplyNotificationPayload" :createdAt="notification.createdAt" />
          <DueDateNotification v-else-if="notification.type === 'issue_due_date'"
            :payload="notification.payload as IssueDueDateNotificationPayload" :createdAt="notification.createdAt" />
          <div v-else class="text-sm text-secondary-foreground">
            Unknown notification type: {{ notification.type }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
