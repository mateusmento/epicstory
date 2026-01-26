<script lang="ts" setup>
import type { User } from "@/domain/user";
import { formatDate, isToday } from "date-fns";

const props = defineProps<{
  sender: User;
  meId: number;
  sentAt: string;
}>();

function formatMessageDate(date: string) {
  if (!date) return;
  return isToday(date) ? formatDate(date, "H:mm a") : formatDate(date, "MMM d");
}
</script>

<template>
  <div class="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
    <img :src="sender?.picture" class="w-12 h-12 rounded-full" />
    <div class="flex:col">
      <div class="flex:row-lg items-baseline ml-5">
        <div class="font-dmSans font-medium text-lg" :class="{ 'order-0': sender.id === meId }">
          {{ sender?.name }}
        </div>
        <div class="text-sm text-secondary-foreground/70 font-dmSans">
          {{ formatMessageDate(sentAt) }}
        </div>
      </div>
      <div class="flex:col ml-2">
        <slot />
      </div>
    </div>
  </div>
</template>
