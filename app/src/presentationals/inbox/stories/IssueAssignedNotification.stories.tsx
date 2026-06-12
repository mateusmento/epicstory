import type { Meta, StoryObj } from "@storybook/vue3";
import IssueAssignedNotification from "../notifications/IssueAssignedNotification.vue";
import { storyNotifications } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Inbox/IssueAssignedNotification",
  component: IssueAssignedNotification,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[420px] p-4"><story /></div>' })],
} satisfies Meta<typeof IssueAssignedNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    payload: storyNotifications.issueAssigned.payload,
    createdAt: storyNotifications.issueAssigned.createdAt,
  },
};
