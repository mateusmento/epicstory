import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { storeToRefs } from "pinia";
import { computed, onUnmounted, watch } from "vue";
import { INBOX_NOTIFICATION_PAGE_SIZE } from "../constants";
import { useNotificationFeedStore } from "../notification-feed.store";
import type { Notification } from "@epicstory/contracts";
import { NotificationApi } from "@epicstory/api-client";

type IncomingListener = (notification: Notification) => void;

const incomingListeners = new Set<IncomingListener>();

export function registerNotificationIncomingListener(listener: IncomingListener) {
  incomingListeners.add(listener);
  return () => incomingListeners.delete(listener);
}

function notifyIncomingListeners(notification: Notification) {
  incomingListeners.forEach((fn) => fn(notification));
}

function isValidNotification(notification: unknown): notification is Notification {
  if (!notification || typeof notification !== "object") return false;
  const n = notification as Notification;
  if (!n.id || !n.type || !n.payload) return false;
  return typeof n.payload === "object";
}

export type UseNotificationsOptions = {
  pageSize?: number;
  /**
   * When true, this instance loads notifications and keeps the websocket subscription alive.
   * Use once at app-shell level (e.g. Dashboard). Other components should omit this.
   */
  manageConnection?: boolean;
};

export function useNotifications(options?: UseNotificationsOptions) {
  const pageSize = options?.pageSize ?? INBOX_NOTIFICATION_PAGE_SIZE;
  const { manageConnection = false } = options ?? {};

  const { user } = useAuth();
  const { websocket } = useWebSockets();
  const notificationApi = useDependency(NotificationApi);
  const feedStore = useNotificationFeedStore();
  const { notifications, isLoading, isLoadingMore, hasMore, error } = storeToRefs(feedStore);

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
    feedStore.isLoading = true;
    feedStore.error = null;

    try {
      const result = await notificationApi.fetchNotifications(userId, {
        page: 0,
        count: pageSize,
      });
      notifications.value = result.content.filter(isValidNotification);
      feedStore.page = 0;
      feedStore.hasMore = result.hasNext;
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error("Failed to fetch notifications");
      feedStore.error = errorMessage;
      console.error("Failed to fetch notifications:", err);
    } finally {
      feedStore.isLoading = false;
    }
  }

  async function fetchMoreNotifications() {
    if (!user.value?.id || feedStore.isLoadingMore || !feedStore.hasMore || feedStore.isLoading) {
      return;
    }

    feedStore.isLoadingMore = true;
    feedStore.error = null;

    try {
      const nextPage = feedStore.page + 1;
      const result = await notificationApi.fetchNotifications(user.value.id, {
        page: nextPage,
        count: pageSize,
      });

      const existing = new Set(notifications.value.map((n) => n.id));
      for (const notification of result.content.filter(isValidNotification)) {
        if (!existing.has(notification.id)) {
          notifications.value.push(notification);
        }
      }

      feedStore.page = nextPage;
      feedStore.hasMore = result.hasNext;
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error("Failed to fetch notifications");
      feedStore.error = errorMessage;
      console.error("Failed to fetch more notifications:", err);
    } finally {
      feedStore.isLoadingMore = false;
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

        feedStore.resetFeed();

        if (!next?.id) {
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
    isLoadingMore,
    hasMore,
    error,
    unseenCount,
    markAsSeen,
    fetchMoreNotifications,
  };
}
