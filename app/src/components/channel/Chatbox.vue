<script lang="ts" setup>
import {
  Button,
  ButtonGroup,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  ScrollArea,
  Separator,
} from "@/design-system";
import { channelComposerQuotedMessageId, type IChannel, type IMessage, type IMessageGroup } from "@/domain/channels";
import { useChannel, useWorkspaceOnline } from "@/domain/channels";
import type { ICreateScheduledMessageBody } from "@/domain/channels/types/scheduled-message.type";
import { useWorkspace } from "@/domain/workspace";
import { CalendarClockIcon, ChevronDownIcon, HashIcon, HeadphonesIcon } from "lucide-vue-next";
import { computed, nextTick, ref, watch } from "vue";
import { UserAvatar, UserAvatarStack } from "@/components/user";
import Message from "./Message.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";

const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
  sendMessage: (message: { content: string; contentRich: any; quotedMessageId?: number }) => Promise<unknown>;
  sendScheduledMessage?: (body: ICreateScheduledMessageBody) => Promise<unknown>;
  updateMessage: (messageId: number, body: { content: string; contentRich: any }) => Promise<unknown>;
  channelId: number;
  channel: IChannel;
}>();

const emit = defineEmits([
  "join-meeting",
  "start-meeting",
  "schedule-meeting",
  "more-details",
  "message-deleted",
]);

const quotedMessage = ref<IMessage | null>(null);
const editingMessage = ref<IMessage | null>(null);
const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null);

const { workspace } = useWorkspace();
const { typingUserIds } = useChannel();
const { isUserOnline } = useWorkspaceOnline();

const onlineUsers = computed(() =>
  props.channel.peers.filter((p) => p.id !== props.meId && isUserOnline(p.id)),
);

const typingPeerNames = computed(() => {
  const ids = typingUserIds.value.filter((id) => id !== props.meId);
  return ids
    .map((id) => props.channel.peers.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n));
});

const typingBannerText = computed(() => {
  const names = typingPeerNames.value;
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are typing…`;
});

function totalMessages(groups: IMessageGroup[]) {
  return groups.reduce((n, g) => n + g.messages.length, 0);
}

/** Tracks list size so we only scroll on append/load, not on in-place edits (height-only changes). */
const prevMessageTotal = ref(-1);

watch(
  () => props.channelId,
  () => {
    prevMessageTotal.value = -1;
  },
);

watch(
  () => totalMessages(props.messageGroups),
  (totalMessages) => {
    const prev = prevMessageTotal.value;
    if (prev < 0) {
      prevMessageTotal.value = totalMessages;
      if (totalMessages > 0) nextTick(() => scrollAreaRef.value?.scrollToBottom());
      return;
    }
    if (totalMessages > prev) {
      prevMessageTotal.value = totalMessages;
      nextTick(() => scrollAreaRef.value?.scrollToBottom());
    } else {
      prevMessageTotal.value = totalMessages;
    }
  },
);

async function onSendMessage(payload: { content: string; contentRich: any; quotedMessageId?: number }) {
  if (!payload.content?.trim()) return;
  await props.sendMessage({
    content: payload.content,
    contentRich: payload.contentRich,
    quotedMessageId:
      payload.quotedMessageId ??
      (quotedMessage.value ? channelComposerQuotedMessageId(quotedMessage.value) : undefined),
  });
  scrollAreaRef.value?.scrollToBottom();
  quotedMessage.value = null;
}

async function onSendScheduledMessage(payload: ICreateScheduledMessageBody) {
  if (!payload.content?.trim()) return;
  const send = props.sendScheduledMessage;
  if (send) {
    await send({
      content: payload.content,
      contentRich: payload.contentRich,
      quotedMessageId: payload.quotedMessageId,
      dueAt: payload.dueAt,
      recurrence: payload.recurrence,
    });
  }
  scrollAreaRef.value?.scrollToBottom();
  quotedMessage.value = null;
}

async function onSubmitEdit(payload: { messageId: number; content: string; contentRich: any }) {
  await props.updateMessage(payload.messageId, {
    content: payload.content,
    contentRich: payload.contentRich,
  });
  editingMessage.value = null;
}

function onCancelEdit() {
  editingMessage.value = null;
}

function onQuote(m: IMessage | undefined) {
  if (!m || "messageId" in m) return;
  quotedMessage.value = m;
  editingMessage.value = null;
}

function onStartEdit(m: IMessage | undefined) {
  if (!m || "messageId" in m) return;
  editingMessage.value = m;
  quotedMessage.value = null;
}

function onMessageDeleted(messageId: number) {
  emit("message-deleted", messageId);
}

defineExpose({
  scrollMessagesToBottom: () => scrollAreaRef.value?.scrollToBottom(),
});
</script>

<template>
  <div class="grid grid-rows-[auto_auto_1fr_auto] h-full">
    <div class="flex h-10 min-w-0 items-center gap-2 p-2">
      <div class="flex shrink-0 items-center gap-2">
        <HashIcon class="h-5 w-5 text-muted-foreground" stroke-width="2.5" />
        <div class="text-sm" @click="emit('more-details')">{{ chatTitle }}</div>
      </div>

      <div class="flex-1"></div>

      <div v-if="onlineUsers.length" class="flex min-w-0 items-center gap-2">
        <UserAvatarStack
          :users="onlineUsers"
          size="md"
          variant="mentionRow"
          :min="1"
          :overlap-px="8"
          class="min-w-0 w-20 justify-end"
        />
        <div class="h-2 w-2 shrink-0 rounded-full bg-green-400"></div>
        <div class="shrink-0 text-xs text-muted-foreground">{{ onlineUsers.length }} online</div>
      </div>

      <ButtonGroup class="ml-xl shrink-0">
        <Button
          size="icon"
          variant="outline"
          @click="emit('join-meeting')"
          class="p-1 text-muted-foreground"
          title="Join meeting"
        >
          <HeadphonesIcon class="w-4 h-4" />
        </Button>

        <Menu type="dropdown-menu">
          <MenuTrigger as-child>
            <Button
              size="icon"
              variant="outline"
              class="p-1 text-muted-foreground"
              title="More meeting actions"
              aria-label="More meeting actions"
            >
              <ChevronDownIcon class="w-4 h-4" />
            </Button>
          </MenuTrigger>
          <MenuContent align="end" class="text-xs font-dmSans">
            <MenuItem @click="emit('start-meeting')">
              <HeadphonesIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
              <span>Start meeting</span>
            </MenuItem>
            <MenuItem @click="emit('schedule-meeting')">
              <CalendarClockIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
              <span>Schedule meeting</span>
            </MenuItem>
          </MenuContent>
        </Menu>
      </ButtonGroup>
    </div>

    <Separator />

    <div class="relative min-h-0">
      <ScrollArea class="min-h-0 h-full" ref="scrollAreaRef">
        <div class="flex:col-xl !flex justify-end p-4 min-h-full pb-14">
          <div class="flex:col-3xl p-xl mb-2xl">
            <div class="flex:row-xl flex:center-y gap-2">
              <UserAvatar
                v-for="member of channel.peers"
                :key="member.id"
                :name="member.name"
                :picture="member.picture"
                size="tileXl"
                class="-ml-10 first:ml-0"
              />
            </div>
            <div class="text-xl text-accent-foreground font-lato">
              This is the begining of a conversation between
              <template v-for="(member, i) of channel.peers" :key="member.id">
                <template v-if="i > 0 && i < channel.peers.length - 1">, </template>
                <template v-else-if="i > 0"> and </template>
                <span
                  class="inline-flex items-center"
                  :class="
                    member.id === meId
                      ? 'px-0.5 rounded-sm bg-mentionHighlight text-mentionHighlight-foreground font-medium'
                      : 'px-0.5 rounded-sm bg-mention-chip text-mention font-medium'
                  "
                >
                  @{{ member.name }}
                </span> </template
              >.
            </div>
          </div>

          <MessageGroup
            v-for="group of messageGroups"
            :key="group.id"
            :sender="group.sender"
            :meId="meId"
            :sentAt="group.sentAt"
          >
            <Message
              v-for="message of group.messages"
              :key="message.id"
              :message
              :meId
              @message-deleted="onMessageDeleted"
              @quote="onQuote"
              @start-edit="onStartEdit"
            />
          </MessageGroup>
        </div>
      </ScrollArea>

      <div v-if="typingPeerNames.length" class="absolute bottom-0 left-0 right-0 mx-7 z-[10]">
        <div
          class="px-2 py-1 border border-b-0 border-muted rounded-lg rounded-b-none text-xs bg-zinc-50 text-muted-foreground"
        >
          {{ typingBannerText }}
        </div>
      </div>
    </div>

    <MessageWriter
      :key="channelId"
      :channel-id="channelId"
      :workspace-id="workspace.id"
      :mentionables="channel.peers"
      :me-id="meId"
      :quoted-message="quotedMessage"
      :editing-message="editingMessage"
      @send-message="onSendMessage"
      @send-scheduled-message="onSendScheduledMessage"
      @submit-edit="onSubmitEdit"
      @clear-quote="quotedMessage = null"
      @cancel-edit="onCancelEdit"
      class="m-4 mt-0 bg-red-transparent"
    />
  </div>
</template>

<style scoped>
.bg-green {
  background-color: #57ca4d;
}
</style>
