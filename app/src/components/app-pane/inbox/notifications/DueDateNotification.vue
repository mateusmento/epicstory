<script lang="tsx" setup>
import type { IssueDueDateNotificationPayload } from "@/domain/notifications/types/notification.types";
import { formatDistanceToNow } from "date-fns";
import { Calendar } from "lucide-vue-next";

const props = defineProps<{
  payload: IssueDueDateNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:col-md">
    <div class="flex:row-md flex:center-y text-sm text-secondary-foreground font-dmSans">
      <Calendar class="w-4 h-4" />
      Issue due date reminder

      <div class="ml-auto text-xs text-secondary-foreground font-dmSans whitespace-nowrap">
        {{ formatTime(createdAt) }}
      </div>
    </div>

    <div class="text-sm text-foreground font-lato truncate">EP-{{ payload.issueId }} {{ payload.title }}</div>
  </div>
</template>
