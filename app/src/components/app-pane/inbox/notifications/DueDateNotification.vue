<script lang="tsx" setup>
import { Icon } from "@/design-system/icons";
import { formatDistanceToNow } from "date-fns";
import type { IssueDueDateNotificationPayload } from "@/domain/notifications/types/notification.types";

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
    <div class="flex:row-md flex:center-y text-sm text-zinc-500 font-dmSans">
      <Icon name="oi-calendar" class="mr-1" />
      Issue due date reminder
    </div>
    <div class="flex:col-md flex-1">
      <div class="flex:row-md flex:center-y">
        <div class="text-foreground font-lato font-semibold">{{ payload.title }}</div>
        <div class="ml-auto text-xs text-zinc-500 font-dmSans">{{ formatTime(createdAt) }}</div>
      </div>
      <div v-if="payload.description" class="text-sm text-zinc-500 font-lato">
        {{ payload.description }}
      </div>
    </div>
  </div>
</template>
