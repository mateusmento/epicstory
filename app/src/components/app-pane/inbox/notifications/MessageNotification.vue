<script lang="tsx" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
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
  if (props.payload.channel.type === 'multi-direct') {
    return props.payload.channel.peers
      .filter((peer) => peer.id !== me?.value?.id)
      .map((peer) => peer.name).join(', ');
  }
  return props.payload.sender?.name;
});

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:row-md">
    <img v-if="payload.sender.picture" :src="payload.sender.picture" :alt="payload.sender.name"
      class="w-11 h-11 rounded-full flex-shrink-0" />
    <div v-else
      class="w-11 h-11 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold">
      {{ payload.sender.name.charAt(0).toUpperCase() }}
    </div>

    <div v-if="payload.sender" class="flex:col-md flex:center-y min-w-0 flex-1">
      <div class="flex:row-md items-baseline">

        <div class="text-sm text-secondary-foreground font-dmSans">
          <IconChats class="w-4 h-4 inline-block" />
          sent you a message
          <div v-if="channelName" class="text-foreground font-lato">and to {{ channelName }}</div>
          <!-- <div class="text-foreground font-lato">{{ payload.sender.name }}</div> -->
        </div>

        <div class="ml-auto text-xs text-secondary-foreground font-dmSans whitespace-nowrap">
          {{ formatTime(createdAt) }}
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <div class="w-full min-w-0 text-foreground font-lato whitespace-nowrap text-ellipsis overflow-hidden">
            {{ payload.message.displayContent ?? payload.message.content }}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {{ payload.message.displayContent ?? payload.message.content }}
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
