<script lang="tsx" setup>
import { IconChats } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import type { DirectMessageNotificationPayload } from "@/domain/notifications/types/notification.types";
import { formatDistanceToNow } from "date-fns";
import { computed } from "vue";

const props = defineProps<{
  payload: DirectMessageNotificationPayload;
  createdAt: string;
}>();

const { user: me } = useAuth();

const channelName = computed(() => {
  if (props.payload.channel.type === "multi-direct") {
    return props.payload.channel.peers
      .filter((peer) => peer.id !== me?.value?.id)
      .map((peer) => peer.name)
      .join(", ");
  }
  return props.payload.sender?.name;
});

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:row-md">
    <div v-if="payload.sender" class="flex:col-md flex:center-y min-w-0 flex-1">
      <div class="flex:row-md items-baseline">
        <div class="text-sm text-secondary-foreground font-dmSans">
          <IconChats class="w-4 h-4 inline-block" />
          sent you a message
          <!-- <div v-if="channelName" class="ml-5 text-foreground font-lato">and to {{ channelName }}</div> -->
        </div>

        <div class="ml-auto text-xs text-secondary-foreground font-dmSans whitespace-nowrap">
          {{ formatTime(createdAt) }}
        </div>
      </div>

      <div class="flex:row-2xl">
        <img
          v-if="payload.sender.picture"
          :src="payload.sender.picture"
          :alt="payload.sender.name"
          class="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold"
        >
          {{ payload.sender.name.charAt(0).toUpperCase() }}
        </div>

        <div class="flex:col flex:center-y min-w-0">
          <span class="text-foreground font-lato">{{ payload.sender.name }}</span>
          <div class="w-full min-w-0 text-sm text-secondary-foreground font-lato truncate">
            {{ payload.message.displayContent ?? payload.message.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
