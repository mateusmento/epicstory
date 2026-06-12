import type { ChatTimelineItem } from "@/lib/chat-timeline";
import MessageBox from "@/presentationals/messages/MessageBox.vue";
import MessageComposerShell from "@/presentationals/messages/MessageComposerShell.vue";
import {
  makeComposerAttachmentsView,
  makeToolbarView,
  tiptapDoc,
} from "@/presentationals/messages/stories/message.fixtures";
import { storyDirectChannel } from "@/presentationals/stories/fixtures";
import { messageGroup, messageGroups } from "@/presentationals/stories/fixtures/message-groups";
import type { IChannel, IMessage, IReply } from "@epicstory/contracts";
import { map, max } from "lodash";
import { computed, defineComponent, ref } from "vue";
import ChatboxShell from "@/presentationals/channel/Chatbox.vue";
import ChatboxIntro from "@/presentationals/channel/ChatboxIntro.vue";
import ChatboxTimeline from "@/presentationals/channel/ChatboxTimeline.vue";

function toChatTimeline(groups: typeof messageGroups.value): ChatTimelineItem[] {
  return groups.map((group) => ({ kind: "messages" as const, group }));
}

export type ChatColumnHarnessOptions = {
  channel?: IChannel;
  timeline?: ChatTimelineItem[];
  meId?: number;
  initialQuote?: IMessage | IReply | null;
  initialEdit?: IMessage | null;
};

export function createChatColumnHarness(options: ChatColumnHarnessOptions = {}) {
  return defineComponent({
    name: "ChatColumnHarness",
    components: { ChatboxShell, ChatboxTimeline, ChatboxIntro, MessageBox, MessageComposerShell },
    setup() {
      const channel = options.channel ?? storyDirectChannel;
      const timelineSource = ref(options.timeline ?? toChatTimeline(messageGroups.value));
      const quotedMessage = ref<IMessage | IReply | null>(options.initialQuote ?? null);
      const editingMessage = ref<IMessage | null>(options.initialEdit ?? null);
      const meId = options.meId ?? 2;
      const olderPage = { hasOlder: false, loadingOlder: false };
      const loadOlder = async () => {};
      const sendCount = ref(0);

      const timeline = computed(() => timelineSource.value);

      const quote = computed(() => {
        const q = quotedMessage.value;
        if (!q) return null;
        return {
          senderName: q.sender.name,
          excerpt: q.displayContent ?? "Quoted message",
        };
      });
      const showQuote = computed(() => quote.value !== null);
      const attachments = ref(makeComposerAttachmentsView());
      const toolbar = computed(() =>
        makeToolbarView({
          isEditing: editingMessage.value !== null,
          sendLabel: editingMessage.value ? "Save" : "Send",
        }),
      );

      function onQuote(m: IMessage | IReply | undefined) {
        if (!m || "messageId" in m) return;
        quotedMessage.value = m;
        editingMessage.value = null;
      }

      function onStartEdit(m: IMessage | IReply | undefined) {
        if (!m || "messageId" in m) return;
        editingMessage.value = m;
        quotedMessage.value = null;
      }

      function onSend() {
        if (editingMessage.value) {
          editingMessage.value = null;
          sendCount.value += 1;
          return;
        }
        messageGroup.value.messages.push({
          id: (max(map(messageGroup.value.messages, "id")) ?? 0) + 1,
          content: tiptapDoc("New message from hero harness"),
          displayContent: "New message from hero harness",
          sentAt: new Date(),
          senderId: meId,
          sender: channel.peers.find((p) => p.id === meId) ?? channel.peers[0]!,
          channelId: channel.id,
          channel,
          repliesCount: 0,
          repliers: [],
          reactions: [],
        } as IMessage);
        quotedMessage.value = null;
        sendCount.value += 1;
      }

      return {
        channel,
        timeline,
        olderPage,
        loadOlder,
        meId,
        quote,
        showQuote,
        attachments,
        toolbar,
        sendCount,
        onQuote,
        onStartEdit,
        onSend,
        clearQuote: () => {
          quotedMessage.value = null;
        },
        cancelEdit: () => {
          editingMessage.value = null;
        },
      };
    },
    template: `
      <ChatboxShell class="h-full min-h-[520px]">
        <template #timeline>
          <ChatboxTimeline
            :channel-id="channel.id"
            :timeline="timeline"
            :older-page="olderPage"
            :load-older="loadOlder"
            :me-id="meId"
          >
            <template #intro>
              <ChatboxIntro :peers="channel.peers" :me-id="meId" />
            </template>
            <template #message="{ message }">
              <MessageBox
                :message="message"
                :me-id="meId"
                @quote="onQuote"
                @edit="onStartEdit"
              />
            </template>
          </ChatboxTimeline>
        </template>
        <template #composer>
          <MessageComposerShell
            class="m-4 mt-0"
            :placeholder="'Message ' + channel.name"
            :quote="quote"
            :show-quote="showQuote"
            :attachments="attachments"
            :toolbar="toolbar"
            :editor="null"
            :me-id="meId"
            @send="onSend"
            @clear-quote="clearQuote"
            @cancel-edit="cancelEdit"
          />
          <p v-if="sendCount" class="mx-4 text-xs text-muted-foreground">Sent/saved: {{ sendCount }}</p>
        </template>
      </ChatboxShell>
    `,
  });
}

export const ChatColumnDefaultHarness = createChatColumnHarness();

export const ChatColumnEmptyHarness = createChatColumnHarness({ timeline: [] });

export const ChatColumnBusyHarness = createChatColumnHarness({
  timeline: toChatTimeline(messageGroups.value),
});

export function createQuoteEditHarness(firstMessage: IMessage) {
  return createChatColumnHarness({
    initialQuote: firstMessage,
  });
}
