<script lang="ts" setup>
import { cva } from "class-variance-authority";
import { formatDate, isToday } from "date-fns";
import { provide } from "vue";
import type { IMessageGroup } from "./types";

const props = defineProps<{
  sender: "me" | "someoneElse";
  messageGroup: IMessageGroup;
}>();

provide("messageGroup", {
  sender: props.sender,
});

function formatMessageDate(date: string) {
  if (!date) return;
  return isToday(date) ? formatDate(date, "H:mm a") : formatDate(date, "MMM d");
}

const styles = {
  messageGroup: cva("", {
    variants: {
      sender: {
        me: "ml-auto gap-y-2",
        someoneElse: "mr-auto",
      },
    },
  }),
};
</script>

<template>
  <div
    class="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-2"
    :class="styles.messageGroup({ sender })"
  >
    <img v-if="sender === 'someoneElse'" :src="messageGroup.sender?.picture" class="w-8 h-8 rounded-full" />
    <div class="flex:cols-md flex:baseline" :class="{ 'col-start-2': sender === 'me' }">
      <div class="font-dmSans font-medium">{{ sender === "me" ? "You" : messageGroup.sender?.name }}</div>
      <div class="ml-lg text-xs text-zinc-400 font-dmSans">{{ formatMessageDate(messageGroup.sentAt) }}</div>
    </div>
    <div class="flex:rows-sm col-start-2 min-w-40 max-w-[35rem]">
      <slot />
    </div>
  </div>
</template>
