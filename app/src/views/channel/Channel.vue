<script lang="ts" setup>
import { Chatbox } from "@/containers/channel";
import Meeting from "@/containers/meeting/Meeting.vue";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { useAuth } from "@/domain/auth";
import { useSyncedChannel, useWorkspaceOnline } from "@/domain/channels";
import { useMeeting } from "@/domain/meetings";
import { SCHEDULE_CHANNEL_ID_QUERY_KEY } from "@/domain/schedule";
import { useWorkspace } from "@/domain/workspace";
import { ChatboxHeader, ChatboxMeetingActions, ChatboxPresenceStrip } from "@/presentationals/channel";
import type { IMessage } from "@epicstory/contracts";
import { useRouter } from "vue-router";

const { channel } = useSyncedChannel();
const { currentMeeting, joinMeeting } = useMeeting();
const { user } = useAuth();
const { workspace } = useWorkspace();
const router = useRouter();
const { viewContent } = useNavTrigger("details-pane");
const { isUserOnline } = useWorkspaceOnline();

function onScheduleMeetingForChannel() {
  if (!channel.value) return;
  router.push({
    name: "schedule",
    params: { workspaceId: String(workspace.value.id) },
    query: { [SCHEDULE_CHANNEL_ID_QUERY_KEY]: String(channel.value.id) },
  });
}

function onOpenThread(message: IMessage) {
  if (!user.value) return;
  viewContent("replies", { message, meId: user.value.id });
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
      v-show="!currentMeeting || currentMeeting.channelId !== channel.id"
      class="flex-1"
      :key="2"
      @open-thread="onOpenThread"
    >
      <template v-if="user" #header>
        <ChatboxHeader :channel-name="channel.name" @more-details="viewContent('channel')">
          <template #presence>
            <ChatboxPresenceStrip :peers="channel.peers" :me-id="user.id" :is-user-online="isUserOnline" />
          </template>
          <template #meeting-actions>
            <ChatboxMeetingActions
              @join-channel-meeting="joinMeeting({ channelId: channel.id })"
              @start-meeting="joinMeeting({ channelId: channel.id })"
              @schedule-meeting="onScheduleMeetingForChannel"
            />
          </template>
        </ChatboxHeader>
      </template>
    </Chatbox>
  </TransitionGroup>
</template>
