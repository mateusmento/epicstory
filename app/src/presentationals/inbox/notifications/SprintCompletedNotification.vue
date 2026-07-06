<script setup lang="ts">
import type { SprintCompletedNotificationPayload } from "@epicstory/contracts";
import { formatDistanceToNow } from "date-fns";
import { TimerIcon } from "lucide-vue-next";

defineProps<{
  payload: SprintCompletedNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:col-md flex:center-y flex-1">
    <div class="flex:row-md flex:center-y text-secondary-foreground font-dmSans">
      <TimerIcon class="size-4 inline-block text-foreground/70" />
      <div class="text-sm">Sprint completed</div>
      <div class="ml-auto text-xs">{{ formatTime(createdAt) }}</div>
    </div>

    <div class="flex:row-md flex:center-y gap-3">
      <div class="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <TimerIcon class="size-4 text-foreground/70" />
      </div>

      <div class="flex:col min-w-0 flex-1">
        <div class="text-sm font-medium truncate">{{ payload.sprintName }}</div>
        <div class="text-xs text-muted-foreground">
          {{ payload.completedItemCount }} of {{ payload.itemCount }} issues done · by
          {{ payload.completedBy?.name ?? "someone" }}
        </div>
      </div>
    </div>
  </div>
</template>
