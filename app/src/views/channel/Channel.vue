<script lang="ts" setup>
import { Chatbox } from "@/components/channel";
import Meeting from "@/components/meeting/Meeting.vue";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { useAuth } from "@/domain/auth";
import { useMeeting, useSyncedChannel } from "@/domain/channels";
import { useWorkspace } from "@/domain/workspace";
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { user } = useAuth();
const { workspace } = useWorkspace();
const { channel, messageGroups, sendMessage, sendScheduledMessage, deleteMessage, updateMessage } =
  useSyncedChannel();
const { currentMeeting, joinChannelMeeting } = useMeeting();

function onScheduleMeetingForChannel() {
  if (!channel.value) return;
  router.push({
    name: "schedule",
    params: { workspaceId: String(workspace.value.id) },
    query: { scheduleChannelId: String(channel.value.id) },
  });
}

const emit = defineEmits<{
  (e: "message-deleted", messageId: number): void;
}>();

const title = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.name : channel.value?.name;
});

const picture = computed(() => {
  if (!channel.value) return "";
  return channel.value?.type === "direct" ? channel.value?.speakingTo.picture : "/images/hashtag.svg";
});

const { viewContent } = useNavTrigger("details-pane");

function onMessageDeleted(messageId: number) {
  deleteMessage(messageId);
  emit("message-deleted", messageId);
}
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
      :chat-title="title"
      :chat-picture="picture"
      :message-groups="messageGroups"
      :me-id="user.id"
      :channel-id="channel.id"
      :send-message="sendMessage"
      :send-scheduled-message="sendScheduledMessage"
      :update-message="updateMessage"
      :channel="channel"
      @join-meeting="joinChannelMeeting({ channelId: channel.id })"
      @start-meeting="joinChannelMeeting({ channelId: channel.id })"
      @schedule-meeting="onScheduleMeetingForChannel"
      @more-details="viewContent('channel')"
      @message-deleted="onMessageDeleted"
      :key="2"
    />
  </TransitionGroup>
</template>
