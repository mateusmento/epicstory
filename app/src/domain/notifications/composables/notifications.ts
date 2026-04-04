import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { NotificationApi } from "../api";
import { useNotificationFeedStore } from "../notification-feed.store";
import type { Notification } from "../types/notification.types";
import { storeToRefs } from "pinia";
import { computed, onUnmounted, watch } from "vue";

type IncomingListener = (notification: Notification) => void;

const incomingListeners = new Set<IncomingListener>();

export function registerNotificationIncomingListener(listener: IncomingListener) {
  incomingListeners.add(listener);
  return () => incomingListeners.delete(listener);
}

function notifyIncomingListeners(notification: Notification) {
  incomingListeners.forEach((fn) => fn(notification));
}

function isValidNotification(notification: any): notification is Notification {
  if (!notification || !notification.id || !notification.type || !notification.payload) {
    return false;
  }
  return typeof notification.payload === "object";
}

export type UseNotificationsOptions = {
  limit?: number;
  /**
   * When true, this instance loads notifications and keeps the websocket subscription alive.
   * Use once at app-shell level (e.g. Dashboard). Other components should omit this.
   */
  manageConnection?: boolean;
};

export function useNotifications(options?: UseNotificationsOptions) {
  const { limit = 100, manageConnection = false } = options || {};

  const { user } = useAuth();
  const { websocket } = useWebSockets();
  const notificationApi = useDependency(NotificationApi);
  const feedStore = useNotificationFeedStore();
  const { notifications, isLoading, error } = storeToRefs(feedStore);

  const unseenCount = computed(() => notifications.value.filter((n) => !n.seen).length);

  function handleIncomingNotification(notification: Notification) {
    const exists = notifications.value.some((n) => n.id === notification.id);
    if (exists || !isValidNotification(notification)) return;
    notifications.value.unshift(notification);
    notifyIncomingListeners(notification);
  }

  function subscribeNotifications(userId: number) {
    websocket.emit("subscribe-notifications", { userId });
    websocket.off("incoming-notification", handleIncomingNotification);
    websocket.on("incoming-notification", handleIncomingNotification);
  }

  function unsubscribeNotifications(userId: number) {
    websocket.emit("unsubscribe-notifications", { userId });
    websocket.off("incoming-notification", handleIncomingNotification);
  }

  async function fetchNotifications(userId: number) {
    isLoading.value = true;
    error.value = null;

    try {
      const { content } = await notificationApi.fetchNotifications(userId, limit);
      notifications.value = content.filter(isValidNotification);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error("Failed to fetch notifications");
      error.value = errorMessage;
      console.error("Failed to fetch notifications:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function markAsSeen(notificationId: string) {
    try {
      await notificationApi.markAsSeen(notificationId);
    } finally {
      const n = notifications.value.find((x) => x.id === notificationId);
      if (n) n.seen = true;
    }
  }

  if (manageConnection) {
    watch(
      user,
      async (next, prev) => {
        if (prev?.id) {
          unsubscribeNotifications(prev.id);
        }

        notifications.value = [];
        error.value = null;

        if (!next?.id) {
          isLoading.value = false;
          return;
        }

        try {
          await fetchNotifications(next.id);
        } finally {
          subscribeNotifications(next.id);
        }
      },
      { immediate: true },
    );

    onUnmounted(() => {
      if (user.value?.id) {
        unsubscribeNotifications(user.value.id);
      }
    });
  }

  return {
    notifications,
    isLoading,
    error,
    unseenCount,
    markAsSeen,
  };
}
