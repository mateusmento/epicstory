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
    <div class="flex:row-lg flex:center-y" :class="{ 'col-start-2 justify-end': sender === 'me' }">
      <img v-if="sender === 'me'" :src="messageGroup.sender?.picture" class="w-6 h-6 rounded-full" />
      <div class="font-dmSans font-medium" :class="{ 'order-0': sender === 'me' }">
        {{ sender === "me" ? "You" : messageGroup.sender?.name }}
      </div>
      <div class="text-xs text-zinc-400 font-dmSans">{{ formatMessageDate(messageGroup.sentAt) }}</div>
    </div>
    <div class="flex:col-sm col-start-2">
      <slot />
    </div>
  </div>
</template>
