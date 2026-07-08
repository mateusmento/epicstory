<script setup lang="ts">
import { Chatbox, ChatboxThread } from "@/containers/channel";
import { Button } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useChannelStore } from "@/domain/channels/composables/channel";
import { useMeeting } from "@/domain/meetings";
import { ChannelActivityRow } from "@/presentationals/channel";
import type { IMeeting, IMessage } from "@epicstory/contracts";
import { HeadphonesIcon, SidebarOpen } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  meeting: IMeeting;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { user } = useAuth();
const { currentMeeting } = useMeeting();
const channelStore = useChannelStore();

watch(
  () => currentMeeting.value?.id,
  (activeMeetingId) => {
    if (activeMeetingId === props.meeting.id) return;
    emit("close");
  },
  { immediate: true },
);

const channel = computed(() => channelStore.channel);
const isMeetingChannel = computed(() => channel.value?.type === "meeting");
const channelTitle = computed(() => channel.value?.name ?? "Channel");

const meetingActivity = computed(() => {
  if (isMeetingChannel.value) return null;
  return (
    channelStore.activities.find((a) => a.type === "meeting_started" && a.meetingId === props.meeting.id) ??
    null
  );
});

/**
 * Minimal IMessage ref anchoring the reply thread for channel meetings.
 * ChatboxThread only needs id + channelId to load replies.
 */
const threadRootMessage = ref<IMessage>({
  id: props.meeting.threadMessageId ?? 0,
  channelId: props.meeting.channelId ?? 0,
  senderId: 0,
  content: { type: "doc", content: [] },
  sender: { id: 0, name: "", email: "" },
  sentAt: new Date() as Date,
  repliesCount: 0,
  repliers: [],
  reactions: [],
});

// Keep the anchor in sync if the meeting prop updates (e.g. threadMessageId arrives after join).
watch(
  () => props.meeting.threadMessageId,
  (id) => {
    if (id != null) threadRootMessage.value = { ...threadRootMessage.value, id };
  },
);
watch(
  () => props.meeting.channelId,
  (channelId) => {
    if (channelId != null) threadRootMessage.value = { ...threadRootMessage.value, channelId };
  },
);
</script>

<template>
  <!-- Meeting channel: full timeline with panel chrome -->
  <Chatbox v-if="isMeetingChannel" class="h-full w-[32rem] shrink-0 flex-1 min-h-0 border-l border-border">
    <template #header>
      <div class="flex items-center gap-2 px-4 h-10 shrink-0 min-w-0">
        <HeadphonesIcon class="h-4 w-4 shrink-0 text-muted-foreground" stroke-width="2.5" />
        <span class="text-sm font-medium truncate">{{ channelTitle }}</span>
        <Button variant="outline" size="icon" class="ml-auto shrink-0" @click="emit('close')">
          <SidebarOpen class="w-4 h-4" />
        </Button>
      </div>
    </template>
  </Chatbox>

  <!-- Channel meeting: reply thread anchored to the meeting_started activity -->
  <ChatboxThread v-else-if="user" v-model:message="threadRootMessage" :meId="user.id" @close="emit('close')">
    <template v-if="meetingActivity && channel" #root>
      <ChannelActivityRow :activity="meetingActivity" :channel-display-name="channel.name" :me-id="user.id" />
      <div class="h-px bg-border mx-4" />
    </template>
  </ChatboxThread>
</template>
