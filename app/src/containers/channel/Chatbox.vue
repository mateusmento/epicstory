<script lang="ts" setup>
import { Chatbox as ChatboxView } from "@/presentationals/channel";
import Message from "./Message.vue";
import { channelMessageComposerAttachmentHandlers, MessageComposer } from "@/containers/messages";
import { useDependency } from "@/core/dependency-injection";
import { useChannel, useWorkspaceOnline } from "@/domain/channels";
import type { ChatTimelineItem } from "@/lib/chat-timeline";
import { isLiveJoinableMeeting } from "@/domain/meetings";
import { ChannelApi } from "@epicstory/api-client";
import type {
  IChannel,
  CreateScheduledMessageBody as ICreateScheduledMessageBody,
  MessagePollBody,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { toOlderPageState } from "@/lib/async";
import { computed } from "vue";

const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  chatTimeline: ChatTimelineItem[];
  sendMessage: (message: {
    content: JSONContent;
    quotedMessageId?: number;
    attachmentIds?: number[];
    poll?: MessagePollBody;
  }) => Promise<unknown>;
  sendScheduledMessage?: (body: ICreateScheduledMessageBody) => Promise<unknown>;
  updateMessage: (
    messageId: number,
    body: { content: JSONContent; attachmentIds?: number[]; poll?: MessagePollBody | null },
  ) => Promise<unknown>;
  channelId: number;
  channel: IChannel;
}>();

const emit = defineEmits<{
  (e: "join-meeting", meetingId: number): void;
  (e: "join-channel-meeting"): void;
  (e: "start-meeting"): void;
  (e: "schedule-meeting"): void;
  (e: "more-details"): void;
  (e: "message-deleted", messageId: number): void;
}>();

const { typingUserIds, hasMoreOlder, loadingOlderActivities, loadOlderActivitiesPage } = useChannel();
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
    channelId: () => props.channelId,
  }),
);

function isMeetingJoinable(meeting: NonNullable<IChannel["meeting"]>) {
  return isLiveJoinableMeeting(meeting);
}
</script>

<template>
  <ChatboxView
    :me-id="meId"
    :chat-title="chatTitle"
    :chat-picture="chatPicture"
    :chat-timeline="chatTimeline"
    :send-message="sendMessage"
    :send-scheduled-message="sendScheduledMessage"
    :update-message="updateMessage"
    :channel-id="channelId"
    :channel="channel"
    :typing-user-ids="typingUserIds"
    :older-page="olderPage"
    :load-older-activities-page="loadOlderActivitiesPage"
    :is-user-online="isUserOnline"
    :is-meeting-joinable="isMeetingJoinable"
    @join-meeting="emit('join-meeting', $event)"
    @join-channel-meeting="emit('join-channel-meeting')"
    @start-meeting="emit('start-meeting')"
    @schedule-meeting="emit('schedule-meeting')"
    @more-details="emit('more-details')"
    @message-deleted="emit('message-deleted', $event)"
  >
    <template #message="{ message, meId: messageMeId, onMessageDeleted, onQuote, onStartEdit }">
      <Message
        :message="message"
        :me-id="messageMeId"
        @message-deleted="onMessageDeleted"
        @quote="onQuote"
        @start-edit="onStartEdit"
      />
    </template>
    <template
      #composer="{
        quotedMessage,
        editingMessage,
        onSendMessage,
        onSendScheduledMessage,
        onSubmitEdit,
        onClearQuote,
        onCancelEdit,
      }"
    >
      <MessageComposer
        :key="channelId"
        :channel-id="channelId"
        enable-composer-poll
        :attachment-handlers="composerAttachmentHandlers"
        :mentionables="channel.peers"
        :me-id="meId"
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
  </ChatboxView>
</template>
