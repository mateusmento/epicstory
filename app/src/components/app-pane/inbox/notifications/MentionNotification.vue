<script lang="tsx" setup>
import { formatDistanceToNow } from "date-fns";
import type { MentionNotificationPayload } from "@/domain/notifications/types/notification.types";

const props = defineProps<{
  payload: MentionNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:col-md">
    <div class="flex:row-md flex:center-y text-sm text-secondary-foreground font-dmSans">
      @ mentioned you in <span class="text-foreground font-semibold">#{{ payload.channelName }}</span>
    </div>
    <div v-if="payload.sender" class="flex:row-md flex:center-y flex-1">
      <img
        v-if="payload.sender.picture"
        :src="payload.sender.picture"
        :alt="payload.sender.name"
        class="w-11 h-11 rounded-full flex-shrink-0"
      />
      <div
        v-else
        class="w-11 h-11 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold"
      >
        {{ payload.sender.name.charAt(0).toUpperCase() }}
      </div>
      <div class="flex:col-md flex-1 min-w-0">
        <div class="flex:row-md flex:center-y">
          <div class="text-foreground font-lato">{{ payload.sender.name }}</div>
          <div class="ml-auto text-xs text-secondary-foreground font-dmSans">{{ formatTime(createdAt) }}</div>
        </div>
        <div
          class="text-sm text-secondary-foreground font-lato text-ellipsis overflow-hidden whitespace-nowrap"
        >
          {{ payload.message }}
        </div>
      </div>
    </div>
  </div>
</template>
