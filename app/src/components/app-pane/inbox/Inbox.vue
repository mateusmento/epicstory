<script lang="ts" setup>
import { Icon } from "@/design-system/icons";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { NotificationApi } from "@/domain/notifications";
import { useDependency } from "@/core/dependency-injection";
import { onMounted, onUnmounted, ref } from "vue";
import type {
  Notification,
  MentionNotificationPayload,
  RepliedNotificationPayload,
  IssueDueDateNotificationPayload,
} from "@/domain/notifications/types/notification.types";
import MentionNotification from "./notifications/MentionNotification.vue";
import RepliedNotification from "./notifications/RepliedNotification.vue";
import DueDateNotification from "./notifications/DueDateNotification.vue";

const { user } = useAuth();
const { websocket } = useWebSockets();
const notificationApi = useDependency(NotificationApi);
const notifications = ref<Notification[]>([]);

// Type guard to check if notification has proper payload structure
function isValidNotification(notification: any): notification is Notification {
  if (!notification || !notification.id || !notification.type || !notification.payload) {
    return false;
  }
  // Basic validation - the payload structure will be validated by the components
  return typeof notification.payload === "object";
}

function onIncomingNotification(notification: Notification) {
  // Check if notification already exists (avoid duplicates)
  const exists = notifications.value.some((n) => n.id === notification.id);
  if (!exists) {
    notifications.value.unshift(notification);
  }
}

async function fetchNotifications() {
  if (!user.value) return;

  try {
    const fetched = await notificationApi.fetchNotifications(user.value.id, 100);
    // Filter and validate notifications
    notifications.value = fetched.filter(isValidNotification) as Notification[];
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
  }
}

function subscribeNotifications() {
  if (!user.value) return;

  // Subscribe to notifications
  websocket.emit("subscribe-notifications", {
    userId: user.value.id,
  });

  // Listen for incoming notifications
  websocket.off("incoming-notification", onIncomingNotification);
  websocket.on("incoming-notification", onIncomingNotification);
}

function unsubscribeNotifications() {
  if (!user.value) return;

  websocket.emit("unsubscribe-notifications", {
    userId: user.value.id,
  });

  websocket.off("incoming-notification", onIncomingNotification);
}

onMounted(async () => {
  await fetchNotifications();
  subscribeNotifications();
});

onUnmounted(() => {
  unsubscribeNotifications();
});
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
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="flex:col-md p-4 border-b hover:bg-secondary transition-colors"
        >
          <MentionNotification
            v-if="notification.type === 'mention'"
            :payload="notification.payload as MentionNotificationPayload"
            :createdAt="notification.createdAt"
          />
          <RepliedNotification
            v-else-if="notification.type === 'replied'"
            :payload="notification.payload as RepliedNotificationPayload"
            :createdAt="notification.createdAt"
          />
          <DueDateNotification
            v-else-if="notification.type === 'issue_due_date'"
            :payload="notification.payload as IssueDueDateNotificationPayload"
            :createdAt="notification.createdAt"
          />
          <div v-else class="text-sm text-zinc-500">Unknown notification type: {{ notification.type }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
