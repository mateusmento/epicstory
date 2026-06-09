import daianaPhoto from "@/assets/images/daiana.png";
import seanPhoto from "@/assets/images/sean.png";
import MessageComposer from "@/containers/messages/MessageComposer.vue";
import MessageBox from "@/presentationals/messages/MessageBox.vue";
import type { Meta, StoryObj } from "@storybook/vue3";
import { map, max } from "lodash";
import { h, ref } from "vue";
import { StoryContainer } from "../../app-pane/channel/story-container";
import ChatboxShell from "../Chatbox.vue";
import ChatboxIntro from "../ChatboxIntro.vue";
import ChatboxTimeline from "../ChatboxTimeline.vue";
import { messageGroup, messageGroups } from "@/containers/channel/stories/message-groups.data";
import type { IMessage } from "@epicstory/contracts";

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

const meta = {
  title: "Design System/Channel/Chatbox",
  component: ChatboxTimeline,
  parameters: {
    layout: "fullscreen",
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
} satisfies Meta<typeof ChatboxTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    channelId: 1,
    timeline: messageGroups.value.map((g) => ({ kind: "messages" as const, group: g })),
    olderPage: { hasOlder: false, loadingOlder: false },
    loadOlder: async () => {},
    meId: 2,
    onQuote: () => {},
    onStartEdit: () => {},
    onMessageDeleted: () => {},
  },
  render: () => ({
    components: { ChatboxShell, ChatboxTimeline, ChatboxIntro, MessageBox, MessageComposer },
    setup() {
      const quotedMessage = ref<IMessage | null>(null);
      const editingMessage = ref<IMessage | null>(null);
      const timeline = messageGroups;

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
            :older-page="{ hasOlder: false, loadingOlder: false }"
            :load-older="async () => {}"
            :me-id="2"
            :on-quote="onQuote"
            :on-start-edit="onStartEdit"
            :on-message-deleted="() => {}"
          >
            <template #intro>
              <ChatboxIntro :peers="channel.peers" :me-id="2" />
            </template>
            <template #message="{ message, onQuote, onStartEdit }">
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
  }),
};
