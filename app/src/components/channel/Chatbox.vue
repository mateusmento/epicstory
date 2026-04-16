<script lang="ts" setup>
import { mergeQuotedMessageIntoDoc, normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
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
import type { IChannel, IMessage, IMessageGroup } from "@/domain/channels";
import { useChannel, useWorkspaceOnline } from "@/domain/channels";
import { useWorkspace } from "@/domain/workspace";
import { CalendarClockIcon, ChevronDownIcon, HashIcon, HeadphonesIcon } from "lucide-vue-next";
import { computed, ref } from "vue";
import Message from "./Message.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";
const props = defineProps<{
  meId: number;
  chatTitle?: string;
  chatPicture?: string;
  messageGroups: IMessageGroup[];
  sendMessage: (message: { content: string; contentRich: any }) => Promise<unknown>;
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

async function onSendMessage(payload: { content: string; contentRich: any }) {
  if (!payload.content?.trim()) return;
  const rich = quotedMessage.value
    ? mergeQuotedMessageIntoDoc(quotedMessage.value, payload.contentRich)
    : payload.contentRich;
  const plain = tiptapToPlainText(normalizeTiptapDoc(rich));
  await props.sendMessage({ content: plain, contentRich: rich });
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
</script>

<template>
  <div class="grid grid-rows-[auto_auto_1fr_auto] h-full">
    <div class="flex:row flex:center-y p-2 h-10">
      <div class="flex:row-lg flex:center-y">
        <HashIcon class="h-5 w-5 text-muted-foreground" stroke-width="2.5" />
        <div class="text-sm" @click="emit('more-details')">{{ chatTitle }}</div>
      </div>

      <div v-if="onlineUsers.length" class="flex:row-lg flex:center-y gap-2 ml-6">
        <div class="flex:row-lg flex:center-y -space-x-3">
          <template v-for="user of onlineUsers.slice(0, 4)" :key="user.id">
            <img v-if="user.picture" :src="user.picture" class="w-6 h-6 rounded-full" />
            <div
              v-else
              class="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold text-sm font-lato"
            >
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
          </template>
          <div
            v-if="onlineUsers.length > 4"
            class="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold text-sm font-lato"
          >
            +{{ Math.max(Math.min(onlineUsers.length - 1, 99), 0) }}
          </div>
        </div>
        <div class="w-2 h-2 bg-green-400 rounded-full"></div>
        <div class="text-xs text-muted-foreground">{{ onlineUsers.length }} online</div>
      </div>

      <ButtonGroup class="ml-auto shrink-0">
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
          <MenuContent align="end">
            <MenuItem class="text-xs" @click="emit('start-meeting')">
              <HeadphonesIcon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
              <div>Start meeting</div>
            </MenuItem>
            <MenuItem class="text-xs" @click="emit('schedule-meeting')">
              <CalendarClockIcon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
              <div>Schedule meeting</div>
            </MenuItem>
          </MenuContent>
        </Menu>
      </ButtonGroup>
    </div>

    <Separator />

    <div class="relative min-h-0">
      <ScrollArea class="min-h-0 h-full" bottom>
        <div class="flex:col-xl !flex justify-end p-4 min-h-full pb-14">
          <div class="flex:col-3xl p-xl mb-2xl">
            <div class="flex:row-xl flex:center-y gap-2">
              <img
                v-for="member of channel.peers"
                :key="member.id"
                :src="member.picture"
                class="w-18 h-18 -ml-10 first:ml-0 rounded-full"
              />
            </div>
            <div class="text-xl text-accent-foreground font-lato">
              This is the begining of a conversation between
              <template v-for="(member, i) of channel.peers" :key="member.id">
                <template v-if="i > 0 && i < channel.peers.length - 1">, </template>
                <template v-else-if="i > 0"> and </template>
                <span class="bg-[#c7f9ff] p-1 rounded-lg text-[#008194] font-bold">
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
      :channel-id="channelId"
      :workspace-id="workspace.id"
      :mentionables="channel.peers"
      :me-id="meId"
      :quoted-message="quotedMessage"
      :editing-message="editingMessage"
      @send-message="onSendMessage"
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
