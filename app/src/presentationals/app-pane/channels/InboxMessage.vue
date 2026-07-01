<script setup lang="ts">
import { Badge } from "@/design-system";
import { cn } from "@/design-system/utils";
import { UserAvatar } from "@/presentationals/user";
import type { IChannel } from "@epicstory/contracts";
import { formatDate, isToday } from "date-fns";
import { HashIcon } from "lucide-vue-next";
import { ref } from "vue";

const props = defineProps<{
  channel: IChannel;
  open?: boolean;
}>();

const emits = defineEmits<{
  (e: "open"): void;
}>();

function onOpenChannel() {
  emits("open");
}

function formatMessageDate(date: Date | string) {
  if (date === undefined || date === null || date === "") return;
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return isToday(d) ? formatDate(d, "H:mm a") : formatDate(d, "MMM d");
}

const isHoveringImage = ref(false);
</script>

<template>
  <div
    :class="
      cn(
        'srf flex:row-2xl flex:center-y p-2 rounded-lg cursor-pointer',
        open ? 'srf-soft srf-primary' : 'srf-ghost srf-default srf--hover',
      )
    "
    @click="onOpenChannel()"
    @pointerover="isHoveringImage = true"
    @pointerleave="isHoveringImage = false"
  >
    <div class="w-10 h-10 flex flex:center">
      <UserAvatar
        v-if="channel.directPeer"
        :name="channel.directPeer.name"
        :picture="channel.directPeer.picture"
        size="lg"
        class="flex-shrink-0"
      />
      <HashIcon v-else class="w-8 h-8 rounded-full" />
    </div>

    <div class="flex:col-sm flex-1 h-full overflow-hidden">
      <div class="flex:row-auto gap-1 flex:center-y">
        <em class="truncate mr-4">
          {{ channel.name }}
        </em>
        <small class="truncate">
          {{ channel.lastMessage ? formatMessageDate(channel.lastMessage.sentAt) : "" }}
        </small>
      </div>

      <div class="flex:row-auto flex:center-y">
        <span class="font-lato mr-4 truncate">
          {{ channel.lastMessage?.displayContent ?? channel.lastMessage?.content }}
        </span>
        <Badge v-if="channel.unreadMessagesCount" variant="flat" intent="primary" size="xs">
          {{ channel.unreadMessagesCount }}
        </Badge>
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
