import type { INotification } from "@epicstory/contracts";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useNotificationFeedStore = defineStore("notification-feed", () => {
  const notifications = ref<INotification[]>([]);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const hasMore = ref(true);
  const page = ref(0);
  const error = ref<Error | null>(null);

  function resetFeed() {
    notifications.value = [];
    isLoading.value = false;
    isLoadingMore.value = false;
    hasMore.value = true;
    page.value = 0;
    error.value = null;
  }

  return {
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    page,
    error,
    resetFeed,
  };
});
