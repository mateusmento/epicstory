<script setup lang="ts">
import { Chatbox, ChatboxThread } from "@/containers/channel";
import { Button } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useChannelStore } from "@/domain/channels/composables/channel";
import { useMeeting } from "@/domain/meetings";
import { ChannelActivityRow } from "@/presentationals/channel";
import type { IMeeting, IMessage } from "@epicstory/contracts";
import { ArrowLeft, HeadphonesIcon, SidebarOpen } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  meeting: IMeeting;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { user } = useAuth();
const { currentMeeting, setChatOpen } = useMeeting();
const channelStore = useChannelStore();

function closePanel() {
  setChatOpen(false);
  emit("close");
}

watch(
  () => currentMeeting.value?.id,
  (activeMeetingId) => {
    if (activeMeetingId === props.meeting.id) return;
    closePanel();
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
function createMeetingThreadRoot(): IMessage {
  return {
    id: props.meeting.threadMessageId ?? 0,
    channelId: props.meeting.channelId ?? 0,
    senderId: 0,
    content: { type: "doc", content: [] },
    sender: { id: 0, name: "", email: "" },
    sentAt: new Date() as Date,
    repliesCount: 0,
    repliers: [],
    reactions: [],
  };
}

type PanelView = "channel" | "thread";

const panelView = ref<PanelView>(isMeetingChannel.value ? "channel" : "thread");
const activeThreadMessage = ref<IMessage>(createMeetingThreadRoot());

const isMeetingRootThread = computed(
  () =>
    !isMeetingChannel.value &&
    props.meeting.threadMessageId != null &&
    activeThreadMessage.value.id === props.meeting.threadMessageId,
);

function openThread(message: IMessage) {
  activeThreadMessage.value = message;
  panelView.value = "thread";
}

function backToChannel() {
  panelView.value = "channel";
}

// Keep the meeting-root anchor in sync if the meeting prop updates (e.g. threadMessageId arrives after join).
watch(
  () => props.meeting.threadMessageId,
  (id, prev) => {
    if (id == null) return;
    if (activeThreadMessage.value.id === 0 || activeThreadMessage.value.id === prev) {
      activeThreadMessage.value = { ...activeThreadMessage.value, id };
    }
  },
);
watch(
  () => props.meeting.channelId,
  (channelId, prev) => {
    if (channelId == null) return;
    if (activeThreadMessage.value.channelId === 0 || activeThreadMessage.value.channelId === prev) {
      activeThreadMessage.value = { ...activeThreadMessage.value, channelId };
    }
  },
);
</script>

<template>
  <Chatbox
    v-if="panelView === 'channel'"
    class="h-full w-[32rem] shrink-0 flex-1 min-h-0 border-l border-border"
    @open-thread="openThread"
  >
    <template #header>
      <div class="flex items-center gap-2 px-4 h-10 shrink-0 min-w-0">
        <HeadphonesIcon class="h-4 w-4 shrink-0 text-muted-foreground" stroke-width="2.5" />
        <span class="text-sm font-medium truncate">{{ channelTitle }}</span>
        <Button variant="outline" size="icon" class="ml-auto shrink-0" @click="closePanel">
          <SidebarOpen class="w-4 h-4" />
        </Button>
      </div>
    </template>
  </Chatbox>

  <ChatboxThread v-else-if="user" v-model:message="activeThreadMessage" :meId="user.id" @close="closePanel">
    <template #header>
      <div class="flex:row-xl flex:center-y justify-between h-10 p-4 gap-2 min-w-0">
        <Button variant="ghost" size="icon" class="shrink-0 gap-1.5 px-2" @click="backToChannel">
          <ArrowLeft class="w-4 h-4" />
          back to channel
        </Button>
        <div class="text-base font-semibold truncate">Thread</div>
        <Button variant="outline" size="icon" class="shrink-0" @click="closePanel">
          <SidebarOpen class="w-4 h-4" />
        </Button>
      </div>
    </template>

    <template v-if="isMeetingRootThread && meetingActivity && channel" #root>
      <ChannelActivityRow :activity="meetingActivity" :channel-display-name="channel.name" :me-id="user.id" />
      <div class="h-px bg-border mx-4" />
    </template>
  </ChatboxThread>
</template>
