import {
  getNotificationToastDescription,
  getNotificationToastTitle,
} from "@/domain/notifications/notification-preview";
import type { Notification } from "@/domain/notifications/types/notification.types";
import { toast } from "vue-sonner";
import { onUnmounted } from "vue";
import { registerNotificationIncomingListener } from "./notifications";

function shouldMirrorToSystemNotification(): boolean {
  if (typeof document === "undefined") return false;
  if (document.visibilityState === "hidden") return true;
  try {
    if (typeof document.hasFocus === "function" && !document.hasFocus()) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function showBrowserNotification(title: string, body: string, tag: string) {
  try {
    new Notification(title, { body, tag });
  } catch {
    /* unsupported or blocked */
  }
}

/**
 * Sonner toasts for every realtime notification, plus browser / OS notifications when
 * the tab is hidden or the window does not have focus (so in-page toasts are easy to miss).
 */
export function useNotificationIncomingAlerts() {
  async function handleIncoming(notification: Notification) {
    const title = getNotificationToastTitle(notification);
    const description = getNotificationToastDescription(notification);

    toast(title, description ? { description } : undefined);

    if (!shouldMirrorToSystemNotification()) return;
    if (typeof Notification === "undefined") return;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return;

    showBrowserNotification(title, description ?? "", notification.id);
  }

  const unregister = registerNotificationIncomingListener((n) => {
    handleIncoming(n);
  });

  onUnmounted(unregister);
}
