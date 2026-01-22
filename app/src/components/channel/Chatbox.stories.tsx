import daianaPhoto from "@/assets/images/daiana.png";
import type { Meta, StoryObj } from "@storybook/vue3";
import { map, max } from "lodash";
import { h } from "vue";
import { StoryContainer } from "../app-pane/channel/story-container";
import Chatbox from "./Chatbox.vue";
import { messageGroup, messageGroups } from "./message-groups.data";

const meta = {
  title: "Design System/Channel/Chatbox",
  component: Chatbox,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
        cellAmount: 5,
        offsetX: 16, // Default is 0 if story has 'fullscreen' layout, 16 if layout is 'padded'
        offsetY: 16, // Default is 0 if story has 'fullscreen' layout, 16 if layout is 'padded'
      },
    },
  },
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="w-fit">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof Chatbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    meId: 2,
    channelId: 1,
    chatTitle: "Daiana",
    chatPicture: daianaPhoto,
    messageGroups: messageGroups.value,
    sendMessage: async (message) => {
      messageGroup.value.messages.push({
        id: (max(map(messageGroup.value.messages, "id")) ?? 0) + 1,
        content: message.content,
      });
      console.log("sendMessage", message);
    },
  },
};
