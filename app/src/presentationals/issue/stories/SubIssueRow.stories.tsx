import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyLabels, storyMembers } from "@/presentationals/stories/fixtures";
import type { IIssue } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import SubIssueRow from "../sub-issues/SubIssueRow.vue";

const sub = {
  id: 501,
  issueKey: "EP-501",
  title: "Add keyboard support for mentions",
  status: "todo",
  labels: storyLabels,
  assignees: storyMembers,
} as IIssue;

const meta = {
  title: "Presentational/Issue/SubIssueRow",
  component: SubIssueRow,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[900px] h-[220px] p-4">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof SubIssueRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { SubIssueRow },
    setup() {
      const removed = ref(false);
      return { sub, removed };
    },
    template: `
      <SubIssueRow
        :sub="sub"
        @toggle-done="sub.status = sub.status === 'done' ? 'todo' : 'done'"
        @remove="removed = true"
      />
      <div class="mt-2 text-xs text-muted-foreground">Removed: {{ removed ? "yes" : "no" }}</div>
    `,
  }),
};
