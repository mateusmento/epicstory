<script lang="ts" setup>
import { channelMessageComposerAttachmentHandlers, MessageComposer } from "@/containers/messages";
import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { chatTimelineMessageIds, useChannel, useChatboxComposerSession } from "@/domain/channels";
import { isLiveJoinableMeeting, useMeeting } from "@/domain/meetings";
import { toOlderPageState } from "@/lib/async";
import {
  ChannelActivityRow,
  ChatboxIntro,
  Chatbox as ChatboxShell,
  ChatboxTimeline,
  ChatboxTypingBanner,
} from "@/presentationals/channel";
import { ChannelApi } from "@epicstory/api-client";
import type {
  CreateScheduledMessageBody,
  IChannel,
  IChannelActivity,
  IMessage,
  SendMessageBody,
  UpdateChannelMessageBody,
} from "@epicstory/contracts";
import { computed, ref } from "vue";
import Message from "./Message.vue";

const emit = defineEmits<{
  (e: "open-thread", message: IMessage): void;
}>();

const { user } = useAuth();
const { joinMeeting } = useMeeting();

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
  const fromMeeting = channel.value?.meeting?.attendees?.map((a) => a.user) ?? [];
  if (fromMeeting.length > 0) return fromMeeting;
  return channel.value?.peers ?? [];
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

function openMeetingThread(activity: IChannelActivity, channel: IChannel) {
  if (!activity.messageId) return;
  const message: IMessage =
    activity.message ??
    ({
      id: activity.messageId,
      channelId: channel.id,
      content: { type: "doc", content: [] },
      sentAt: new Date(activity.createdAt),
      senderId: activity.actor?.id ?? 0,
      sender: activity.actor,
      repliesCount: 0,
      repliers: [],
      reactions: [],
    } as IMessage);
  emit("open-thread", message);
}
</script>

<template>
  <ChatboxShell v-if="user && channel">
    <template v-if="$slots.header" #header>
      <slot name="header" />
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
            @open-thread="emit('open-thread', message)"
          />
        </template>
        <template #activity="{ activity }">
          <ChannelActivityRow
            :activity="activity"
            :channel-display-name="channel.name"
            :me-id="user.id"
            :can-join-meeting="canJoinMeetingFromActivity(activity)"
            :meeting-attendees="meetingAttendeesFromActivity(activity)"
            @join-meeting="joinMeeting({ channelId: channel.id })"
            @open-thread="openMeetingThread(activity, channel)"
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
