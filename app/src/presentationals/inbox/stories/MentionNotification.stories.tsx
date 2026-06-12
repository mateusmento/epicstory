import type { Meta, StoryObj } from "@storybook/vue3";
import MentionNotification from "../notifications/MentionNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/MentionNotification",
  component: MentionNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof MentionNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.mention.payload,
    createdAt: storyNotifications.mention.createdAt,
  },
};
