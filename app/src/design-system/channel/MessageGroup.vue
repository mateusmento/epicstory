<script lang="ts" setup>
import { cva } from "class-variance-authority";
import type { IMessageGroup } from "./message-group.type";
import type { Moment } from "moment";
import moment from "moment";
import IconEmoji from "../icons/IconEmoji.vue";

const props = defineProps<{
  meId: number;
  messageGroup: IMessageGroup;
}>();

const styles = {
  messageBox: cva(
    [
      "group",
      "flex:cols-auto items-end",
      "px-3 py-1.5 border border-[#E4E4E4]",
      "first:rounded-t-xl last:rounded-b-xl rounded-md",
      "shadow-sm",
    ].join(" "),
    {
      variants: {
        sender: {
          me: "first:rounded-tr-none",
          someoneElse: "first:rounded-tl-none",
        },
      },
    },
  ),
};

function formatDate(date: string | Moment) {
  if (!date) return;
  return moment().startOf("day").isSame(moment(date).startOf("day"))
    ? moment(date).format("H:mm A")
    : moment(date).format("MMM D");
}
</script>

<template>
  <div class="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-2">
    <img :src="messageGroup.sender.picture" class="w-8 h-8" />
    <div class="flex:cols-md flex:baseline">
      <div>{{ meId === messageGroup.sender.id ? "You" : messageGroup.sender.name }}</div>
      <div class="ml-lg text-xs text-zinc-400">{{ formatDate(messageGroup.sentAt) }}</div>
    </div>
    <div class="flex:rows-sm col-start-2">
      <div
        v-for="message of messageGroup.messages"
        :key="message.id"
        :class="styles.messageBox({ sender: meId === messageGroup.sender.id ? 'me' : 'someoneElse' })"
      >
        {{ message.content }}
        <div
          class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-zinc-200/60 rounded-full p-1"
        >
          <IconEmoji />
        </div>
      </div>
    </div>
  </div>
</template>
