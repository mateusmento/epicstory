import type { Meta, StoryObj } from "@storybook/vue3";
import DueDateNotification from "../notifications/DueDateNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/DueDateNotification",
  component: DueDateNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof DueDateNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.issueDueDate.payload,
    createdAt: storyNotifications.issueDueDate.createdAt,
  },
};
