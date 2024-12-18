<script setup lang="ts">
import { useChannel, useChannels, useMeeting } from "@/domain/channels";
import { onMounted } from "vue";
import Aside from "./aside/Aside.vue";
import Channel from "./channel/Channel.vue";
import Meeting from "./meeting/Meeting.vue";

const { fetchChannels } = useChannels();
const { channel: openChannel } = useChannel();

const { ongoingMeeting, subscribeMeetings, joinMeeting, requestMeeting, leaveOngoingMeeting } = useMeeting();

async function meetingEnded() {
  ongoingMeeting.value = null;
  if (openChannel.value) openChannel.value.meeting = null;
}

onMounted(async () => {
  await fetchChannels();
  subscribeMeetings();
});
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
          @left-meeting="leaveOngoingMeeting"
          :key="1"
        />
        <Channel
          v-show="!ongoingMeeting"
          :channel="openChannel"
          class="h-full"
          @join-meeting="openChannel.meeting ? joinMeeting(openChannel) : requestMeeting(openChannel)"
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
