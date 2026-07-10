<script setup lang="ts">
import { Chatbox } from "@/containers/channel";
import { Button, Separator } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { useShareToChannelStore } from "@/domain/channels/composables/share-to-channel";
import type { IMessage } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { SidebarOpen } from "lucide-vue-next";
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  channelId: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { user } = useAuth();
const { fetchChannel, channel, resetAndLoadLatestActivities, joinChannel, leaveChannel, fetchMembers } =
  useChannel();
const shareStore = useShareToChannelStore();

const externalQuote = ref<IMessage | null>(null);
const seedContent = ref<JSONContent | null>(null);
const ready = ref(false);

async function loadChannel(channelId: number) {
  ready.value = false;
  externalQuote.value = null;
  seedContent.value = null;
  await fetchChannel(channelId);
  joinChannel();
  await resetAndLoadLatestActivities();
  await fetchMembers();
  const pending = shareStore.consumePending();
  if (pending?.channelId === channelId) {
    if (pending.quotedMessage) externalQuote.value = pending.quotedMessage;
    if (pending.initialContent) seedContent.value = pending.initialContent;
  }
  ready.value = true;
}

onMounted(() => loadChannel(props.channelId));

onUnmounted(() => {
  leaveChannel();
});

watch(
  () => props.channelId,
  (id) => {
    leaveChannel();
    loadChannel(id);
  },
);
</script>

<template>
  <div class="flex h-full min-h-0 w-[min(100vw,28rem)] flex-col border-l border-border">
    <div class="flex items-center gap-2 px-3 py-2 h-10">
      <div class="min-w-0 flex-1 truncate text-sm font-medium">
        {{ channel?.name ?? "Channel" }}
      </div>
      <Button type="button" variant="ghost" size="icon" class="size-8 shrink-0" @click="emit('close')">
        <SidebarOpen class="size-4" />
        <span class="sr-only">Close</span>
      </Button>
    </div>
    <Separator />
    <div class="min-h-0 flex-1">
      <Chatbox
        v-if="ready && channel && user && channel.id === props.channelId"
        :key="`${channel.id}-${seedContent ? 'seed' : 'plain'}`"
        :external-quoted-message="externalQuote"
        :seed-content="seedContent"
        @clear-external-quote="externalQuote = null"
      />
    </div>
  </div>
</template>
