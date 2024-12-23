<script lang="ts" setup>
import { Chatbox } from "@/components/channel";
import { useAuth } from "@/domain/auth";
import { useChannel, useMeeting } from "@/domain/channels";
import { computed, onMounted, watch } from "vue";
import Meeting from "../derbel/meeting/Meeting.vue";

const { user } = useAuth();
const { channel: openChannel, messageGroups, fetchMessages, joinChannel, fetchMembers } = useChannel();
const { ongoingMeeting, requestMeeting, joinMeeting, leaveOngoingMeeting, endMeeting } = useMeeting();

const title = computed(() =>
  openChannel.value?.type === "direct" ? openChannel.value?.speakingTo.name : openChannel.value?.name,
);

const picture = computed(() =>
  openChannel.value?.type === "direct" ? openChannel.value?.speakingTo.picture : "/images/hashtag.svg",
);

onMounted(async () => {
  joinChannel();
  fetchMessages();
  fetchMembers();
});

watch(
  () => openChannel.value?.id,
  () => {
    joinChannel();
    fetchMessages();
    fetchMembers();
  },
);
</script>

<template>
  <TransitionGroup v-if="openChannel">
    <Meeting
      v-if="ongoingMeeting"
      v-show="ongoingMeeting && ongoingMeeting.id === openChannel.meeting?.id"
      :meetingId="ongoingMeeting.id"
      @meeting-ended="endMeeting"
      @left-meeting="leaveOngoingMeeting"
      :key="1"
    />
    <Chatbox
      v-if="user"
      v-show="!ongoingMeeting || ongoingMeeting.id !== openChannel.meeting?.id"
      class="flex-1"
      :channel="openChannel"
      :chat-title="title"
      :chat-picture="picture"
      :message-groups="messageGroups"
      :me-id="user.id"
      @join-meeting="openChannel.meeting ? joinMeeting(openChannel) : requestMeeting(openChannel)"
      :key="2"
    />
  </TransitionGroup>
</template>
