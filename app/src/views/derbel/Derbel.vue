<script setup lang="ts">
import { useWebSockets } from "@/core/websockets";
import { useChannel, useChannels, useMeeting, type IChannel as IChannel } from "@/domain/channels";
import { onMounted } from "vue";
import Aside from "./aside/Aside.vue";
import Channel from "./channel/Channel.vue";
import Meeting from "./meeting/Meeting.vue";

const { channels, fetchChannels } = useChannels();
const { channel: openChannel } = useChannel();

const sockets = useWebSockets();
const { ongoingMeeting } = useMeeting();

onMounted(async () => {
  fetchChannels();

  for (const channel of channels.value)
    sockets.websocket.emit("meeting-notification", { channelId: channel.id });

  sockets.websocket.on("incoming-meeting", ({ meeting }: any) => {
    const channel = channels.value.find((c) => c.id === meeting.channelId);
    if (channel) channel.meeting = meeting;
  });

  sockets.websocket.on("meeting-ended", ({ channelId }: any) => {
    const channel = channels.value.find((c) => c.id === channelId);
    if (channel) channel.meeting = null;
    ongoingMeeting.value = null;
  });
});

async function requestMeeting() {
  if (!openChannel.value) return;
  const channel = openChannel.value;
  sockets.websocket.emit("request-meeting", { channelId: channel.id }, (data: any) => {
    ongoingMeeting.value = data;
    channel.meeting = data;
  });
}

async function joinMeeting(channel: IChannel) {
  openChannel.value = channel;
  ongoingMeeting.value = channel.meeting;
}

async function meetingEnded() {
  ongoingMeeting.value = null;
  if (openChannel.value) openChannel.value.meeting = null;
}

async function leftMeeting() {
  ongoingMeeting.value = null;
}
</script>

<template>
  <div class="flex justify-center h-screen p-5 gap-2.5 overflow-hidden" id="app">
    <Aside @join-meeting="joinMeeting" />

    <main class="main-section flex-1 rounded-r-xl bg-slate-100">
      <TransitionGroup v-if="openChannel">
        <Meeting
          v-if="ongoingMeeting"
          v-show="ongoingMeeting"
          :meetingId="ongoingMeeting.id"
          @meeting-ended="meetingEnded"
          @left-meeting="leftMeeting"
          :key="1"
        />
        <Channel
          v-show="!ongoingMeeting"
          :channel="openChannel"
          class="h-full"
          @request-meeting="requestMeeting"
          @join-meeting="joinMeeting(openChannel)"
          :key="2"
        />
      </TransitionGroup>
      <div v-else class="flex justify-center items-center h-full">Open a channel</div>
    </main>
  </div>
</template>

<style scoped src="@/views/derbel/styles/main.css"></style>

<style scoped>
.main-section {
  border-radius: 40px;
  padding: 10px;
  background: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
}

.v-enter-active,
.v-leave-active {
  transition: opacity 400ms ease;
}

.v-leave-to,
.v-enter-from {
  opacity: 0;
}
</style>
