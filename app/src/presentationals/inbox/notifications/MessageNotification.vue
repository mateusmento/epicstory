<script lang="tsx" setup>
import { UserAvatar } from "@/presentationals/user";
import { IconChats } from "@/design-system/icons";
import type { DirectMessageNotificationPayload } from "@epicstory/contracts";
import type { IUser } from "@epicstory/contracts";
import { formatDistanceToNow } from "date-fns";
import { computed } from "vue";

const props = defineProps<{
  payload: DirectMessageNotificationPayload;
  createdAt: string;
  meId?: number | null;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

const channelName = computed(() => {
  if (props.payload.channel.type === "multi-direct") {
    return props.payload.channel.peers
      .filter((peer: IUser) => peer.id !== props.meId)
      .map((peer: IUser) => peer.name)
      .join(", ");
  }
  return props.payload.sender?.name;
});
</script>

<template>
  <div class="flex:row-md">
    <div v-if="payload.sender" class="flex:col-md flex:center-y min-w-0 flex-1">
      <div class="flex:row-md items-baseline">
        <div class="text-sm text-secondary-foreground font-dmSans">
          <IconChats class="w-4 h-4 inline-block" />
          sent you a message
        </div>

        <div class="ml-auto text-xs text-secondary-foreground font-dmSans whitespace-nowrap">
          {{ formatTime(createdAt) }}
        </div>
      </div>

      <div class="flex:row-2xl">
        <UserAvatar
          :name="payload.sender.name"
          :picture="payload.sender.picture"
          size="lg"
          class="flex-shrink-0"
        />

        <div class="flex:col flex:center-y min-w-0">
          <span class="text-sm truncate text-foreground font-lato">{{ channelName }}</span>
          <div class="w-full min-w-0 text-sm truncate text-secondary-foreground font-lato">
            {{ payload.message.displayContent ?? payload.message.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
