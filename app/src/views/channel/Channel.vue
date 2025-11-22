<script lang="ts" setup>
import { Chatbox } from "@/components/channel";
import Meeting from "@/components/meeting/Meeting.vue";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { useAuth } from "@/domain/auth";
import { useMeeting, useSyncedChannel } from "@/domain/channels";
import { computed } from "vue";

const { user } = useAuth();
const { channel, messageGroups, sendMessage } = useSyncedChannel();
const { currentMeeting, joinMeeting } = useMeeting();

const title = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.name : channel.value?.name;
});

const picture = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.picture : "/images/hashtag.svg";
});

const { viewContent } = useNavTrigger("details-pane");
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
      :send-message="async (message) => await sendMessage(message)"
      @join-meeting="joinMeeting(channel)"
      @more-details="viewContent('channel')"
      :key="2"
    />
  </TransitionGroup>
</template>
