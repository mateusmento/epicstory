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
  <div v-if="payload.sender" class="flex:col-md flex:center-y flex-1">
    <div class="flex:row-md flex:center-y items-baseline text-secondary-foreground font-dmSans">
      <IconReplies class="w-4 h-4 inline-block" />
      <div class="text-sm">
        replied to you in <span class="text-foreground font-medium">{{ payload.channel.name }}</span>
      </div>
      <div class="ml-auto text-xs">{{ formatTime(createdAt) }}</div>
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

      <div class="flex:col flex:center-y">
        <span class="text-foreground font-lato">{{ payload.sender.name }}</span>

        <Tooltip>
          <TooltipTrigger as-child>
            <div class="w-full min-w-0 text-sm text-secondary-foreground font-lato truncate">
              {{ payload.reply.displayContent ?? payload.reply.content }}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {{ payload.reply.displayContent ?? payload.reply.content }}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </div>
</template>
