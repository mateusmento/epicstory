<script lang="ts" setup>
import { cva } from "class-variance-authority";
import type { Moment } from "moment";
import moment from "moment";
import { provide } from "vue";
import type { IMessageGroup } from "./types";

const props = defineProps<{
  sender: "me" | "someoneElse";
  messageGroup: IMessageGroup;
}>();

provide("messageGroup", {
  sender: props.sender,
});

function formatDate(date: string | Moment) {
  if (!date) return;
  return moment().startOf("day").isSame(moment(date).startOf("day"))
    ? moment(date).format("H:mm A")
    : moment(date).format("MMM D");
}

const styles = {
  messageGroup: cva("w-96", {
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
    <img v-if="sender === 'someoneElse'" :src="messageGroup.sender.picture" class="w-8 h-8 rounded-full" />
    <div class="flex:cols-md flex:baseline" :class="{ 'col-start-2': sender === 'me' }">
      <div class="font-dmSans font-medium">{{ sender === "me" ? "You" : messageGroup.sender.name }}</div>
      <div class="ml-lg text-xs text-zinc-400 font-dmSans">{{ formatDate(messageGroup.sentAt) }}</div>
    </div>
    <div class="flex:rows-sm col-start-2">
      <slot />
    </div>
  </div>
</template>
