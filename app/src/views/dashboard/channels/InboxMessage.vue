<script setup lang="ts">
import { useChannel, useMeeting } from "@/domain/channels";
import type { IChannel } from "@/domain/channels/types/channel.type";
import IconAcceptCall from "@/views/derbel/icons/IconAcceptCall.vue";
import moment, { type Moment } from "moment";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  channel: IChannel;
  open?: boolean;
}>();

const emit = defineEmits(["join-meeting"]);
const router = useRouter();

const { meeting } = useMeeting();
const { openChannel } = useChannel();

const image = computed(() =>
  props.channel.type === "direct" ? props.channel.speakingTo.picture : "/images/hashtag.svg",
);

function onOpenChannel() {
  openChannel(props.channel);
  router.push(`/channel/${props.channel.id}`);
}

function formatDate(date: string | Moment) {
  if (!date) return;
  return moment().startOf("day").isSame(moment(date).startOf("day"))
    ? moment(date).format("H:mm A")
    : moment(date).format("MMM D");
}
</script>

<template>
  <div
    @click="onOpenChannel()"
    class="flex:cols-2xl flex:center-y p-4 border-t hover:bg-neutral-200/60 cursor-pointer"
  >
    <img :src="image" class="w-10 h-10 rounded-full" />
    <div class="self:fill flex:rows-md">
      <div class="flex:cols-auto flex:center-y">
        <div class="text-base font-semibold text-zinc-800">
          {{ channel.type === "direct" ? channel.speakingTo.name : channel.name }}
        </div>
        <div class="text-xs text-zinc-500">
          {{ channel.lastMessage ? formatDate(channel.lastMessage.sentAt) : "" }}
        </div>
      </div>
      <div class="flex:cols-auto flex:center-y">
        <div class="text-sm" :class="[channel.unreadMessagesCount === 0 ? 'text-zinc-500' : 'text-zinc-800']">
          {{ channel.lastMessage?.content }}
        </div>
        <div
          v-if="channel.unreadMessagesCount > 0"
          class="w-fit px-1 py-0 rounded-sm bg-zinc-200 text-xs text-zinc-500"
        >
          {{ channel.unreadMessagesCount }}
        </div>
      </div>
    </div>
    <div v-if="channel.meeting && !meeting" class="accept-call flex gap-5">
      <button @click.stop="emit('join-meeting')" class="p-2 border-none rounded-full bg-green-500">
        <IconAcceptCall />
      </button>
    </div>
  </div>
</template>
