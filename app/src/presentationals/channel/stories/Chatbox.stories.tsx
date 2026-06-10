import daianaPhoto from "@/assets/images/daiana.png";
import seanPhoto from "@/assets/images/sean.png";
import MessageComposer from "@/containers/messages/MessageComposer.vue";
import { messageGroup, messageGroups } from "@/containers/channel/stories/message-groups.data";
import type { ChatTimelineItem } from "@/lib/chat-timeline";
import MessageBox from "@/presentationals/messages/MessageBox.vue";
import type { IMessage } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { map, max } from "lodash";
import { computed, defineComponent, h, ref } from "vue";
import { StoryContainer } from "../../app-pane/channel/story-container";
import ChatboxShell from "../Chatbox.vue";
import ChatboxIntro from "../ChatboxIntro.vue";
import ChatboxTimeline from "../ChatboxTimeline.vue";

const channel = {
  id: 1,
  name: "Daiana",
  type: "direct" as const,
  workspaceId: 1,
  createdAt: new Date(),
  directPeer: { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
  unreadMessagesCount: 0,
  meeting: null,
  peers: [
    { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
    { id: 2, name: "Jean", picture: seanPhoto, email: "jean@example.com" },
  ],
};

function toChatTimeline(groups: typeof messageGroups.value): ChatTimelineItem[] {
  return groups.map((group) => ({ kind: "messages" as const, group }));
}

const ChatboxStory = defineComponent({
  name: "ChatboxStory",
  components: { ChatboxShell, ChatboxTimeline, ChatboxIntro, MessageBox, MessageComposer },
  setup() {
    const quotedMessage = ref<IMessage | null>(null);
    const editingMessage = ref<IMessage | null>(null);
    const timeline = computed(() => toChatTimeline(messageGroups.value));
    const olderPage = { hasOlder: false, loadingOlder: false };
    const loadOlder = async () => {};

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

    async function onSendMessage(payload: { content: unknown }) {
      messageGroup.value.messages.push({
        id: (max(map(messageGroup.value.messages, "id")) ?? 0) + 1,
        content: payload.content,
        sentAt: new Date(),
        senderId: 2,
        sender: {
          id: 2,
          name: "Jean",
          picture: seanPhoto,
          email: "jean@example.com",
        },
        channelId: 1,
        channel,
        repliesCount: 0,
        repliers: [],
        reactions: [],
      } as IMessage);
      quotedMessage.value = null;
    }

    return {
      channel,
      timeline,
      olderPage,
      loadOlder,
      quotedMessage,
      editingMessage,
      onQuote,
      onStartEdit,
      onSendMessage,
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
              @start-edit="onStartEdit"
            />
          </template>
        </ChatboxTimeline>
      </template>
      <template #composer>
        <MessageComposer
          :channel-id="channel.id"
          :mentionables="channel.peers"
          :me-id="2"
          :quoted-message="quotedMessage"
          :editing-message="editingMessage"
          @send-message="onSendMessage"
          @clear-quote="quotedMessage = null"
          @cancel-edit="editingMessage = null"
          class="m-4 mt-0"
        />
      </template>
    </ChatboxShell>
  `,
});

const meta = {
  title: "Design System/Channel/Chatbox",
  component: ChatboxShell,
  parameters: {
    layout: "fullscreen",
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
