import type { Meta, StoryObj } from "@storybook/vue3";
import MessageNotification from "../notifications/MessageNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/MessageNotification",
  component: MessageNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof MessageNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.directMessage.payload,
    createdAt: storyNotifications.directMessage.createdAt,
    meId: 1,
  },
};
