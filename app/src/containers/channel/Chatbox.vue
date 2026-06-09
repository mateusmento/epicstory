<script lang="ts" setup>
import Message from "./Message.vue";
import { channelMessageComposerAttachmentHandlers, MessageComposer } from "@/containers/messages";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import {
  chatTimelineMessageIds,
  useChannel,
  useChatboxComposerSession,
  useWorkspaceOnline,
} from "@/domain/channels";
import { isLiveJoinableMeeting, useMeeting } from "@/domain/meetings";
import { SCHEDULE_CHANNEL_ID_QUERY_KEY } from "@/domain/schedule";
import { useWorkspace } from "@/domain/workspace";
import { toOlderPageState } from "@/lib/async";
import {
  ChannelActivityRow,
  Chatbox as ChatboxShell,
  ChatboxHeader,
  ChatboxIntro,
  ChatboxMeetingActions,
  ChatboxPresenceStrip,
  ChatboxTimeline,
  ChatboxTypingBanner,
} from "@/presentationals/channel";
import { ChannelApi } from "@epicstory/api-client";
import type {
  IChannel,
  IChannelActivity,
  CreateScheduledMessageBody,
  MessagePollBody,
  SendMessageBody,
  UpdateChannelMessageBody,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const { user } = useAuth();
const { workspace } = useWorkspace();
const router = useRouter();
const { viewContent } = useNavTrigger("details-pane");
const { joinMeeting, joinChannelMeeting } = useMeeting();

const {
  channel,
  chatTimeline,
  sendMessage,
  sendScheduledMessage,
  updateMessage,
  deleteMessage,
  typingUserIds,
  hasMoreOlder,
  loadingOlderActivities,
  loadOlderActivitiesPage,
} = useChannel();

const { isUserOnline } = useWorkspaceOnline();

const olderPage = computed(() =>
  toOlderPageState({
    hasOlder: hasMoreOlder.value,
    loadingOlder: loadingOlderActivities.value,
  }),
);

const channelApi = useDependency(ChannelApi);

const composerAttachmentHandlers = computed(() =>
  channelMessageComposerAttachmentHandlers({
    channelApi,
    channelId: () => channel.value?.id ?? 0,
  }),
);

const messageIds = chatTimelineMessageIds(chatTimeline);

const { quotedMessage, editingMessage, onQuote, onStartEdit, onCancelEdit, onClearQuote } =
  useChatboxComposerSession({ messageIds });

const timelineRef = ref<InstanceType<typeof ChatboxTimeline> | null>(null);

function isMeetingJoinable(meeting: NonNullable<IChannel["meeting"]>) {
  return isLiveJoinableMeeting(meeting);
}

function canJoinMeetingFromActivity(activity: IChannelActivity) {
  if (activity.type !== "meeting_started") return false;
  const meetingId = activity.meetingId;
  const live = channel.value?.meeting;
  if (!live || !meetingId || live.id !== meetingId) return false;
  return isMeetingJoinable(live);
}

function meetingAttendeesFromActivity(activity: IChannelActivity) {
  if (!canJoinMeetingFromActivity(activity)) return [];
  return channel.value?.meeting?.attendees.map((a) => a.user) ?? [];
}

function onScheduleMeetingForChannel() {
  if (!channel.value) return;
  router.push({
    name: "schedule",
    params: { workspaceId: String(workspace.value.id) },
    query: { [SCHEDULE_CHANNEL_ID_QUERY_KEY]: String(channel.value.id) },
  });
}

function onMessageDeleted(messageId: number) {
  deleteMessage(messageId);
}

async function onSendMessage(payload: SendMessageBody) {
  await sendMessage(payload);
  timelineRef.value?.scrollToBottom();
  onClearQuote();
}

async function onSendScheduledMessage(payload: CreateScheduledMessageBody) {
  await sendScheduledMessage(payload);
  timelineRef.value?.scrollToBottom();
  onClearQuote();
}

async function onSubmitEdit(messageId: number, payload: UpdateChannelMessageBody) {
  await updateMessage(messageId, payload);
  onCancelEdit();
}
</script>

<template>
  <ChatboxShell v-if="user && channel">
    <template #header>
      <ChatboxHeader :channel-name="channel.name" @more-details="viewContent('channel')">
        <template #presence>
          <ChatboxPresenceStrip :peers="channel.peers" :me-id="user.id" :is-user-online="isUserOnline" />
        </template>
        <template #meeting-actions>
          <ChatboxMeetingActions
            @join-channel-meeting="joinChannelMeeting({ channelId: channel.id })"
            @start-meeting="joinChannelMeeting({ channelId: channel.id })"
            @schedule-meeting="onScheduleMeetingForChannel"
          />
        </template>
      </ChatboxHeader>
    </template>

    <template #timeline>
      <ChatboxTimeline
        ref="timelineRef"
        :channel-id="channel.id"
        :timeline="chatTimeline"
        :older-page="olderPage"
        :load-older="loadOlderActivitiesPage"
        :me-id="user.id"
      >
        <template #intro>
          <ChatboxIntro :peers="channel.peers" :me-id="user.id" />
        </template>
        <template #message="{ message }">
          <Message
            :message="message"
            :me-id="user.id"
            @message-deleted="onMessageDeleted"
            @quote="onQuote"
            @start-edit="onStartEdit"
          />
        </template>
        <template #activity="{ activity }">
          <ChannelActivityRow
            :activity="activity"
            :channel-display-name="channel.name"
            :me-id="user.id"
            :can-join-meeting="canJoinMeetingFromActivity(activity)"
            :meeting-attendees="meetingAttendeesFromActivity(activity)"
            @join-meeting="joinMeeting({ meetingId: $event })"
          />
        </template>
      </ChatboxTimeline>
    </template>

    <template #typing>
      <ChatboxTypingBanner :typing-user-ids="typingUserIds" :peers="channel.peers" :me-id="user.id" />
    </template>

    <template #composer>
      <MessageComposer
        :key="channel.id"
        :channel-id="channel.id"
        enable-composer-poll
        :attachment-handlers="composerAttachmentHandlers"
        :mentionables="channel.peers"
        :me-id="user.id"
        :quoted-message="quotedMessage"
        :editing-message="editingMessage"
        @send-message="onSendMessage"
        @send-scheduled-message="onSendScheduledMessage"
        @submit-edit="onSubmitEdit"
        @clear-quote="onClearQuote"
        @cancel-edit="onCancelEdit"
        class="m-4 mt-0 bg-red-transparent"
      />
    </template>
  </ChatboxShell>
</template>
