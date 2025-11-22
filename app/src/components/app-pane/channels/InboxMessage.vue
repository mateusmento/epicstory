<script setup lang="ts">
import IconAcceptCall from "@/components/icons/IconAcceptCall.vue";
import { useChannel, type IChannel } from "@/domain/channels";
import { formatDate, isToday } from "date-fns";
import { computed } from "vue";

const props = defineProps<{
  channel: IChannel;
  open?: boolean;
  canJoinMeeting?: boolean;
}>();

const emit = defineEmits(["join-meeting"]);

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
</script>

<template>
  <div
    @click="onOpenChannel()"
    class="flex:row-2xl flex:center-y p-3 border-t hover:bg-secondary cursor-pointer"
    :class="{ 'bg-secondary': open }"
  >
    <img :src="image" class="w-10 h-10 rounded-full" />

    <div class="flex:col-sm flex-1 overflow-hidden">
      <div class="flex:row-auto flex:center-y">
        <div class="text-base font-medium font-dmSans text-foreground">
          {{ channel.type === "direct" ? channel.speakingTo.name : channel.name }}
        </div>
        <div class="text-xs text-secondary-foreground font-dmSans">
          {{ channel.lastMessage ? formatMessageDate(channel.lastMessage.sentAt) : "" }}
        </div>
      </div>

      <div class="flex:row-auto flex:center-y">
        <div
          class="text-sm font-lato text-ellipsis overflow-hidden whitespace-nowrap"
          :class="[channel.unreadMessagesCount > 0 ? 'text-foreground' : 'text-secondary-foreground']"
        >
          {{ channel.lastMessage?.content }}
        </div>
        <div
          v-if="!channel.unreadMessagesCount"
          class="w-fit px-1 py-0 rounded-sm bg-secondary text-secondary-foreground text-xs"
        >
          {{ channel.unreadMessagesCount ?? 2 }}
        </div>
      </div>
    </div>

    <div v-if="canJoinMeeting" class="accept-call w-fit flex gap-5">
      <button @click.stop="emit('join-meeting')" class="p-2 border-none rounded-full bg-green-500">
        <IconAcceptCall />
      </button>
    </div>
  </div>
</template>
