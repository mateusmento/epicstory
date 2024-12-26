<script lang="ts" setup>
import { Chatbox } from "@/components/channel";
import Meeting from "@/components/meeting/Meeting.vue";
import { useAuth } from "@/domain/auth";
import { useMeeting, useSyncedChannel } from "@/domain/channels";
import { computed } from "vue";

const { user } = useAuth();
const { channel, messageGroups } = useSyncedChannel();
const { currentMeeting, joinMeeting } = useMeeting();

const title = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.name : channel.value?.name;
});

const picture = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.picture : "/images/hashtag.svg";
});
</script>

<template>
  <TransitionGroup v-if="channel">
    <Meeting
      v-if="currentMeeting"
      v-show="currentMeeting && currentMeeting.channelId === channel.id"
      :meetingId="currentMeeting.id"
      :key="1"
    />
    <Chatbox
      v-if="user"
      v-show="!currentMeeting || currentMeeting.channelId !== channel.id"
      class="flex-1"
      :channel="channel"
      :chat-title="title"
      :chat-picture="picture"
      :message-groups="messageGroups"
      :me-id="user.id"
      @join-meeting="joinMeeting(channel)"
      :key="2"
    />
  </TransitionGroup>
</template>
