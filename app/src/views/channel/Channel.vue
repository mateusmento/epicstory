<script lang="ts" setup>
import { Chatbox } from "@/components/channel";
import { useAuth } from "@/domain/auth";
import { useChannel, useChannels, useMeeting } from "@/domain/channels";
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import Meeting from "@/components/meeting/Meeting.vue";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";

const route = useRoute();

const { user } = useAuth();
const { channels, fetchChannels, subscribeMessages } = useChannels();
const { channel, messageGroups, openChannel, fetchMessages, joinChannel, fetchMembers } = useChannel();
const { ongoingMeeting, subscribeMeetings, requestMeeting, joinMeeting, leaveOngoingMeeting, endMeeting } =
  useMeeting();
const { viewContent } = useNavTrigger("app-pane");

const title = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.name : channel.value?.name;
});

const picture = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.picture : "/images/hashtag.svg";
});

function selectChannel(channelId: number) {
  const channel = channels.value.find((c) => c.id === channelId);
  if (channel) openChannel(channel);
}

onMounted(async () => {
  if (channels.value.length === 0) await fetchChannels();
  if (viewContent.value !== "channels") viewContent.value = "channels";
  selectChannel(+route.params.channelId);
  joinChannel();
  fetchMessages();
  fetchMembers();
  subscribeMeetings();
  subscribeMessages();
});

watch(
  () => route.params.channelId,
  () => {
    selectChannel(+route.params.channelId);
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
