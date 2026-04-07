import type { Notification } from "@/domain/notifications/types/notification.types";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useNotificationFeedStore = defineStore("notification-feed", () => {
  const notifications = ref<Notification[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  return { notifications, isLoading, error };
});
