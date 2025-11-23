<script setup lang="ts">
import { formatDate, isThisYear, isToday } from "date-fns";

const props = defineProps<{
  senderPicture: string;
  senderName: string;
  message: string;
  seen: boolean;
  unseenMessageCount: number;
  sentAt: string;
}>();

function formatMessageDate(date: string) {
  if (!date) return;
  return isToday(date)
    ? formatDate(date, "H:mm a")
    : isThisYear(date)
      ? formatDate(date, "MMM d")
      : formatDate(date, "MMM d, yyyy");
}
</script>

<template>
  <div class="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr] gap-x-2">
    <img :src="senderPicture" class="row-start-1 col-span-1 w-8 h-8 rounded-full" />
    <div class="row-start-1 col-start-2 text-base font-medium font-dmSans text-foreground">
      {{ senderName }}
    </div>
    <div class="row-start-2 col-start-2 text-xs text-secondary-foreground/70 font-dmSans">
      {{ message }}
    </div>
    <div
      v-if="!seen"
      class="row-start-1 col-start-3 flex flex:center w-fit h-fit px-1 py-0.5 rounded-md bg-unseenMessageCount"
    >
      <span class="text-xs text-unseenMessageCount-foreground">{{ unseenMessageCount }}</span>
    </div>
    <div class="row-start-2 col-start-3 text-xs text-secondary-foreground/70 font-dmSans">
      {{ formatMessageDate(sentAt) }}
    </div>
  </div>
</template>
