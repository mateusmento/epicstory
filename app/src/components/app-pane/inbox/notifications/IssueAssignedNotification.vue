<script lang="tsx" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { IssueAssignedNotificationPayload } from "@/domain/notifications/types/notification.types";
import { formatDistanceToNow } from "date-fns";
import { SquareUser } from "lucide-vue-next";

const props = defineProps<{
  payload: IssueAssignedNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:row-md">
    <img
      v-if="payload.issuer.picture"
      :src="payload.issuer.picture"
      :alt="payload.issuer.name"
      class="w-11 h-11 rounded-full flex-shrink-0"
    />
    <div
      v-else
      class="w-11 h-11 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold"
    >
      {{ payload.issuer.name.charAt(0).toUpperCase() }}
    </div>

    <div class="flex:col-md flex-1 min-w-0">
      <div class="flex:row-md items-baseline">
        <div class="text-sm text-secondary-foreground font-dmSans flex-1">
          <SquareUser class="w-4 h-4 inline-block" />
          <span class="flex-1">
            assigned issue to you
            <!-- <div class="text-foreground font-lato">{{ payload.issuer.name }}</div> -->
          </span>
        </div>

        <span class="ml-auto text-xs text-secondary-foreground font-dmSans whitespace-nowrap">
          {{ formatTime(createdAt) }}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="w-full min-w-0 text-foreground font-lato whitespace-nowrap text-ellipsis overflow-hidden"
          >
            {{ payload.issue.title }}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {{ payload.issue.title }}
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
