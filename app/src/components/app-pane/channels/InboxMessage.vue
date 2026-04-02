<script setup lang="ts">
import { useChannel, type IChannel } from "@/domain/channels";
import { formatDate, isToday } from "date-fns";
import { computed, ref } from "vue";

const props = defineProps<{
  channel: IChannel;
  open?: boolean;
}>();

const { openChannel } = useChannel();

const image = computed(() =>
  props.channel.type === "direct" ? props.channel.speakingTo.picture : "/images/hashtag.svg",
);

function onOpenChannel() {
  openChannel(props.channel);
}

function formatMessageDate(date: string) {
  if (!date) return;
  return isToday(date) ? formatDate(date, "H:mm a") : formatDate(date, "MMM d");
}

const isHoveringImage = ref(false);
</script>

<template>
  <div
    class="flex:row-2xl flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
    :class="{ 'bg-secondary': open }"
    @click="onOpenChannel()"
    @pointerover="isHoveringImage = true"
    @pointerleave="isHoveringImage = false"
  >
    <div class="w-10 h-10 flex flex:center">
      <img
        :src="image"
        class="rounded-full"
        :class="{ 'w-10 h-10': channel.type === 'direct', 'w-8 h-8': channel.type === 'group' }"
        key="img"
      />
    </div>

    <div class="flex:col flex-1 h-full overflow-hidden">
      <div class="flex:row-auto flex:center-y">
        <div class="text-sm text-foreground">
          {{ channel.type === "direct" ? channel.speakingTo.name : channel.name }}
        </div>
        <div class="text-xs text-secondary-foreground">
          {{ channel.lastMessage ? formatMessageDate(channel.lastMessage.sentAt) : "" }}
        </div>
      </div>

      <div class="flex:row-auto flex:center-y">
        <div
          class="text-sm font-lato text-ellipsis overflow-hidden whitespace-nowrap"
          :class="[channel.unreadMessagesCount > 0 ? 'text-foreground' : 'text-secondary-foreground']"
        >
          {{ channel.lastMessage?.displayContent ?? channel.lastMessage?.content }}
        </div>
        <div
          v-if="!channel.unreadMessagesCount"
          class="w-fit px-1 py-0 rounded-sm bg-secondary text-secondary-foreground text-xs"
        >
          {{ channel.unreadMessagesCount }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inbox-swap-enter-active,
.inbox-swap-leave-active {
  transition: opacity 100ms;
}

.inbox-swap-leave-active {
  pointer-events: none;
}

.inbox-swap-enter-from,
.inbox-swap-leave-to {
  opacity: 0;
}
</style>
