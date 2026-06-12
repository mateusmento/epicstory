import IssueKey from "../IssueKey.vue";
import { storyIssueKeys } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";

const meta = {
  title: "Presentational/Issue/IssueKey",
  component: IssueKey,
  tags: ["autodocs"],
} satisfies Meta<typeof IssueKey>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    issueKey: storyIssueKeys.backlog,
  },
};

export const Small: Story = {
  args: {
    issueKey: storyIssueKeys.inProgress,
    size: "sm",
  },
};

export const Copyable: Story = {
  args: {
    issueKey: storyIssueKeys.backlog,
    copyable: true,
    size: "sm",
  },
};
