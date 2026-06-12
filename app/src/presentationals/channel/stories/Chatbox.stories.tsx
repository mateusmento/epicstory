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
import { StoryContainer } from "@/presentationals/stories/story-container";
import type { IMessage, IReply } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { map, max } from "lodash";
import { computed, defineComponent, h, ref } from "vue";
import ChatboxShell from "../Chatbox.vue";
import ChatboxIntro from "../ChatboxIntro.vue";
import ChatboxTimeline from "../ChatboxTimeline.vue";

function toChatTimeline(groups: typeof messageGroups.value): ChatTimelineItem[] {
  return groups.map((group) => ({ kind: "messages" as const, group }));
}

const ChatboxStory = defineComponent({
  name: "ChatboxStory",
  components: { ChatboxShell, ChatboxTimeline, ChatboxIntro, MessageBox, MessageComposerShell },
  setup() {
    const quotedMessage = ref<IMessage | IReply | null>(null);
    const editingMessage = ref<IMessage | null>(null);
    const timeline = computed(() => toChatTimeline(messageGroups.value));
    const olderPage = { hasOlder: false, loadingOlder: false };
    const loadOlder = async () => {};

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
    const sendCount = ref(0);

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
        content: tiptapDoc("New message from story harness"),
        displayContent: "New message from story harness",
        sentAt: new Date(),
        senderId: 2,
        sender: storyDirectChannel.peers[1]!,
        channelId: storyDirectChannel.id,
        channel: storyDirectChannel,
        repliesCount: 0,
        repliers: [],
        reactions: [],
      } as IMessage);
      quotedMessage.value = null;
      sendCount.value += 1;
    }

    return {
      channel: storyDirectChannel,
      timeline,
      olderPage,
      loadOlder,
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
    <ChatboxShell class="h-full">
      <template #timeline>
        <ChatboxTimeline
          :channel-id="channel.id"
          :timeline="timeline"
          :older-page="olderPage"
          :load-older="loadOlder"
          :me-id="2"
        >
          <template #intro>
            <ChatboxIntro :peers="channel.peers" :me-id="2" />
          </template>
          <template #message="{ message }">
            <MessageBox
              :message="message"
              :me-id="2"
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
          :me-id="2"
          @send="onSend"
          @clear-quote="clearQuote"
          @cancel-edit="cancelEdit"
        />
        <p v-if="sendCount" class="mx-4 text-xs text-muted-foreground">Sent/saved: {{ sendCount }}</p>
      </template>
    </ChatboxShell>
  `,
});

const meta = {
  title: "Presentational/Channel/Chatbox",
  component: ChatboxShell,
  parameters: {
    controls: { disable: true },
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
        cellAmount: 5,
        offsetX: 16,
        offsetY: 16,
      },
    },
  },
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="w-fit h-[600px]">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof ChatboxShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ChatboxStory,
};
