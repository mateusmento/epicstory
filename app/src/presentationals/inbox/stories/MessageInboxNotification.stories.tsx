import type { Meta, StoryObj } from "@storybook/vue3";
import MessageInboxNotification from "../MessageInboxNotification.vue";
import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyUsers } from "@/presentationals/stories/fixtures";
import { h } from "vue";

const meta = {
  title: "Presentational/Inbox/MessageInboxNotification",
  component: MessageInboxNotification,
  tags: ["autodocs"],
  parameters: {
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
    senderPicture: storyUsers.sean.picture,
    senderName: storyUsers.sean.name,
    message: "Hey, I'll send you the updates later.",
    seen: false,
    unseenMessageCount: 4,
    sentAt: "2025-11-01",
  },
};

export const Seen: Story = {
  args: {
    ...Default.args,
    seen: true,
    unseenMessageCount: 0,
  },
};
