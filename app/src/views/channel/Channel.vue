<script lang="ts" setup>
import { Chatbox } from "@/containers/channel";
import Meeting from "@/containers/meeting/Meeting.vue";
import { useSyncedChannel } from "@/domain/channels";
import { useMeeting } from "@/domain/meetings";

const { channel } = useSyncedChannel();
const { currentMeeting } = useMeeting();
</script>

<template>
  <TransitionGroup v-if="channel">
    <Meeting
      v-if="currentMeeting"
      v-show="currentMeeting && currentMeeting.channelId === channel.id"
      :meetingId="currentMeeting.id"
      :key="1"
    />
    <Chatbox v-show="!currentMeeting || currentMeeting.channelId !== channel.id" class="flex-1" :key="2" />
  </TransitionGroup>
</template>
