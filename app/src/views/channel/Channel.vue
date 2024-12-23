<script lang="ts" setup>
import { Chatbox } from "@/components/channel";
import { useAuth } from "@/domain/auth";
import { ChannelService, useChannel, useMeeting } from "@/domain/channels";
import { computed, onMounted, watch } from "vue";
import Meeting from "../derbel/meeting/Meeting.vue";
import { useDependency } from "@/core/dependency-injection";
import { useRoute } from "vue-router";

const route = useRoute();

const { user } = useAuth();
const channelApi = useDependency(ChannelService);
const { channel, messageGroups, openChannel, fetchMessages, joinChannel, fetchMembers } = useChannel();
const { ongoingMeeting, requestMeeting, joinMeeting, leaveOngoingMeeting, endMeeting } = useMeeting();

const title = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.name : channel.value?.name;
});

const picture = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.picture : "/images/hashtag.svg";
});

onMounted(async () => {
  if (!channel.value) {
    const channel = await channelApi.findChannel(+route.params.channelId);
    openChannel(channel);
  }
  joinChannel();
  fetchMessages();
  fetchMembers();
});

watch(
  () => channel.value?.id,
  () => {
    joinChannel();
    fetchMessages();
    fetchMembers();
  },
);
</script>

<template>
  <TransitionGroup v-if="channel">
    <Meeting
      v-if="ongoingMeeting"
      v-show="ongoingMeeting && ongoingMeeting.id === channel.meeting?.id"
      :meetingId="ongoingMeeting.id"
      @meeting-ended="endMeeting"
      @left-meeting="leaveOngoingMeeting"
      :key="1"
    />
    <Chatbox
      v-if="user"
      v-show="!ongoingMeeting || ongoingMeeting.id !== channel.meeting?.id"
      class="flex-1"
      :channel="channel"
      :chat-title="title"
      :chat-picture="picture"
      :message-groups="messageGroups"
      :me-id="user.id"
      @join-meeting="channel.meeting ? joinMeeting(channel) : requestMeeting(channel)"
      :key="2"
    />
  </TransitionGroup>
</template>
