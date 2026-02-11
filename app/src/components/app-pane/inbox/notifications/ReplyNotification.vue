<script lang="tsx" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { IconReplies } from "@/design-system/icons";
import type { ReplyNotificationPayload } from "@/domain/notifications/types/notification.types";
import { formatDistanceToNow } from "date-fns";

defineProps<{
  payload: ReplyNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:row-md">
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

    <div v-if="payload.sender" class="flex:col-md flex:center-y flex-1">
      <div class="flex:row-md items-baseline">
        <div class="text-sm text-secondary-foreground font-dmSans">
          <IconReplies class="w-4 h-4 inline-block" />
          replied to you in
          <span class="text-foreground font-semibold">#{{ payload.channel.name }}</span>
          <!-- <div class="text-foreground font-lato">{{ payload.sender.name }}</div> -->
        </div>

        <div class="ml-auto text-xs text-secondary-foreground font-dmSans">
          {{ formatTime(createdAt) }}
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <div class="text-sm text-foreground font-lato text-ellipsis overflow-hidden whitespace-nowrap">
            {{ payload.reply.displayContent ?? payload.reply.content }}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {{ payload.reply.displayContent ?? payload.reply.content }}
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
