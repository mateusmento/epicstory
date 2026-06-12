import type { Meta, StoryObj } from "@storybook/vue3";
import MessageReactionNotification from "../notifications/MessageReactionNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/MessageReactionNotification",
  component: MessageReactionNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof MessageReactionNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MessageReaction: Story = {
  args: {
    kind: "message_reaction",
    payload: storyNotifications.messageReaction.payload,
    createdAt: storyNotifications.messageReaction.createdAt,
  },
};

export const ReplyReaction: Story = {
  args: {
    kind: "reply_reaction",
    payload: storyNotifications.replyReaction.payload,
    createdAt: storyNotifications.replyReaction.createdAt,
  },
};
