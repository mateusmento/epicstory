<script setup lang="ts">
import type { IChannel } from "@/domain/channels/types/channel.type";
import { computed } from "vue";

const props = defineProps<{
  channel: IChannel;
}>();

const lastMessage = computed(() => props.channel.lastMessage);
const image = computed(() =>
  props.channel.type === "direct" ? props.channel.speakingTo.picture : "/images/hashtag.svg",
);
</script>

<template>
  <div class="flex:cols-2xl flex:center-y p-4 border-t hover:bg-neutral-200/60 cursor-pointer">
    <img :src="image" class="w-10 h-10" />
    <div class="self:fill flex:rows-md">
      <div class="flex:cols-auto flex:center-y">
        <div class="text-base font-semibold text-zinc-800">
          {{ channel.type === "direct" ? channel.speakingTo.name : channel.name }}
        </div>
        <div class="text-xs text-zinc-500">{{ lastMessage?.sentAt }}</div>
      </div>
      <div class="flex:cols-auto flex:center-y">
        <div class="text-sm" :class="[channel.unreadMessagesCount === 0 ? 'text-zinc-500' : 'text-zinc-800']">
          {{ lastMessage?.content }}
        </div>
        <div
          v-if="channel.unreadMessagesCount > 0"
          class="w-fit px-1 py-0 rounded-sm bg-zinc-200 text-xs text-zinc-500"
        >
          {{ channel.unreadMessagesCount }}
        </div>
      </div>
    </div>
  </div>
</template>
