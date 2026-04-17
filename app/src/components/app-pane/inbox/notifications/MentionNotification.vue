<script lang="tsx" setup>
import { UserAvatar } from "@/components/user";
import type { MentionNotificationPayload } from "@/domain/notifications/types/notification.types";
import { formatDistanceToNow } from "date-fns";
import { AtSignIcon } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  payload: MentionNotificationPayload;
  createdAt: string;
}>();

const channelName = computed(() => {
  if (props.payload.message && props.payload.reply) {
    return "thread";
  }
  if (props.payload.channel.type === "multi-direct") {
    return props.payload.channel.peers.map((peer) => peer.name).join(", ");
  }
  if (props.payload.channel.type === "direct") {
    return "direct message";
  }
  return "#" + props.payload.channel.name;
});

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:col-md">
    <div class="flex:row-auto flex:center-y text-sm text-secondary-foreground font-dmSans">
      <div class="flex:row-md flex:center-y">
        <AtSignIcon class="w-4 h-4 inline-block" />
        <span>mentioned you in</span>
        <span class="text-foreground font-medium">{{ channelName }}</span>
      </div>

      <div class="ml-auto text-xs text-secondary-foreground font-dmSans">{{ formatTime(createdAt) }}</div>
    </div>
    <div v-if="payload.sender" class="flex:row-2xl flex:center-y flex-1">
      <UserAvatar
        :name="payload.sender.name"
        :picture="payload.sender.picture"
        size="lg"
        class="flex-shrink-0"
      />
      <div class="flex:col flex-1 min-w-0">
        <div class="text-foreground font-lato">{{ payload.sender.name }}</div>
        <div class="w-full min-w-0 text-sm text-secondary-foreground font-lato truncate">
          {{ payload.message }}
        </div>
      </div>
    </div>
  </div>
</template>
