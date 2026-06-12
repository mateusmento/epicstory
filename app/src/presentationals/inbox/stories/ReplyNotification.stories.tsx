import type { Meta, StoryObj } from "@storybook/vue3";
import ReplyNotification from "../notifications/ReplyNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/ReplyNotification",
  component: ReplyNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof ReplyNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.reply.payload,
    createdAt: storyNotifications.reply.createdAt,
  },
};
