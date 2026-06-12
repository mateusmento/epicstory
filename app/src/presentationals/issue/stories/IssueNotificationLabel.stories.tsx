import IssueNotificationLabel from "../IssueNotificationLabel.vue";
import { storyIssueKeys } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Presentational/Issue/IssueNotificationLabel",
  component: IssueNotificationLabel,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div class="w-80 p-4"><story /></div>',
    }),
  ],
} satisfies Meta<typeof IssueNotificationLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithIssueKey: Story = {
  args: {
    issueKey: storyIssueKeys.backlog,
    issueId: 42,
    title: "Fix navbar overlap on mobile",
  },
};

export const FallbackToId: Story = {
  args: {
    issueId: 108,
    title: "Legacy notification without issue key",
  },
};

export const LongTitle: Story = {
  args: {
    issueKey: storyIssueKeys.inProgress,
    issueId: 108,
    title: "Implement GitHub branch linking with automatic PR status sync across workspaces",
  },
};
