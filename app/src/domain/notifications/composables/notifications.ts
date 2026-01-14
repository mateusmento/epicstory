import { useDependency } from "@/core/dependency-injection";
import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { NotificationApi } from "../api";
import type { Notification } from "../types/notification.types";
import { onMounted, onUnmounted, ref } from "vue";

/**
 * Type guard to check if notification has proper payload structure
 */
function isValidNotification(notification: any): notification is Notification {
  if (!notification || !notification.id || !notification.type || !notification.payload) {
    return false;
  }
  // Basic validation - the payload structure will be validated by the components
  return typeof notification.payload === "object";
}

/**
 * Composable for managing notifications
 * Handles fetching, websocket subscriptions, and state management
 */
export function useNotifications(options?: { limit?: number; autoSubscribe?: boolean }) {
  const { limit = 100, autoSubscribe = true } = options || {};

  const { user } = useAuth();
  const { websocket } = useWebSockets();
  const notificationApi = useDependency(NotificationApi);

  const notifications = ref<Notification[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  /**
   * Handles incoming notification from websocket
   */
  function handleIncomingNotification(notification: Notification) {
    // Check if notification already exists (avoid duplicates)
    const exists = notifications.value.some((n) => n.id === notification.id);
    if (!exists && isValidNotification(notification)) {
      notifications.value.unshift(notification);
    }
  }

  /**
   * Fetches notifications from the API
   */
  async function fetchNotifications() {
    if (!user.value) {
      error.value = new Error("User not authenticated");
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const fetched = await notificationApi.fetchNotifications(user.value.id, limit);
      // Filter and validate notifications
      notifications.value = fetched.filter(isValidNotification) as Notification[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error("Failed to fetch notifications");
      error.value = errorMessage;
      console.error("Failed to fetch notifications:", err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Subscribes to websocket notifications
   */
  function subscribeNotifications() {
    if (!user.value) return;

    // Subscribe to notifications
    websocket.emit("subscribe-notifications", {
      userId: user.value.id,
    });

    // Listen for incoming notifications
    websocket.off("incoming-notification", handleIncomingNotification);
    websocket.on("incoming-notification", handleIncomingNotification);
  }

  /**
   * Unsubscribes from websocket notifications
   */
  function unsubscribeNotifications() {
    if (!user.value) return;

    websocket.emit("unsubscribe-notifications", {
      userId: user.value.id,
    });

    websocket.off("incoming-notification", handleIncomingNotification);
  }

  /**
   * Initializes notifications: fetches and subscribes
   */
  async function initialize() {
    await fetchNotifications();
    if (autoSubscribe) {
      subscribeNotifications();
    }
  }

  /**
   * Cleans up: unsubscribes from websocket
   */
  function cleanup() {
    unsubscribeNotifications();
  }

  // Auto-initialize and cleanup on mount/unmount if autoSubscribe is enabled
  if (autoSubscribe) {
    onMounted(initialize);
    onUnmounted(cleanup);
  }

  return {
    // State
    notifications,
    isLoading,
    error,

    // Methods
    fetchNotifications,
    subscribeNotifications,
    unsubscribeNotifications,
    initialize,
    cleanup,
  };
}
