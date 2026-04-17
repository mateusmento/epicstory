<script lang="tsx" setup>
import { UserAvatar } from "@/components/user";
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
      <UserAvatar
        :name="payload.sender.name"
        :picture="payload.sender.picture"
        size="lg"
        class="flex-shrink-0"
      />

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
