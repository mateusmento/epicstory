import type { Meta, StoryObj } from "@storybook/vue3";
import MessageInboxNotification from "./MessageInboxNotification.vue";
import { StoryContainer } from "../app-pane/channel/story-container";
import seanPhoto from "@/assets/images/sean.png";
import { h } from "vue";

const meta = {
  title: "Components/MessageInboxNotifications",
  component: MessageInboxNotification,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      grid: {
        cellSize: 20,
        opacity: 0.5,
      },
    },
  },
  decorators: [
    (story) => ({
      render: () => <StoryContainer class="w-96">{h(story())}</StoryContainer>,
    }),
  ],
} satisfies Meta<typeof MessageInboxNotification>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    senderPicture: seanPhoto,
    senderName: "Sean",
    message: "Hey, I'll send you the updates later.",
    seen: false,
    unseenMessageCount: 4,
    sentAt: "2025-11-01",
  },
};
