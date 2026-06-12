import { StoryContainer } from "@/presentationals/stories/story-container";
import { storyLabels } from "@/presentationals/stories/fixtures";
import { storyMembers } from "@/presentationals/stories/fixtures";
import type { IBacklogItem } from "@epicstory/contracts";
import type { Meta, StoryObj } from "@storybook/vue3";
import { h, ref } from "vue";
import IssueCard from "../IssueCard.vue";

const item = {
  id: 31,
  issue: {
    id: 301,
    issueKey: "EP-301",
    title: "Support milestone in issue details",
    status: "doing",
    priority: 3,
    dueDate: new Date("2026-06-20T00:00:00.000Z"),
    assignees: storyMembers,
    labels: storyLabels,
  },
} as IBacklogItem;

const meta = {
  title: "Presentational/Views/Issue/IssueCard",
  component: IssueCard,
  decorators: [
    (story) => ({ render: () => <StoryContainer class="w-[480px] h-[340px] p-4">{h(story())}</StoryContainer> }),
  ],
} satisfies Meta<typeof IssueCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueCard },
    setup() {
      const openedIssue = ref<number | null>(null);
      return { item, openedIssue };
    },
    template: `
      <IssueCard :item="item" @open-issue="openedIssue = $event.id">
        <template #labels>
          <div class="text-xs text-muted-foreground">+{{ item.issue.labels.length }} labels</div>
        </template>
      </IssueCard>
      <div class="mt-2 text-xs text-muted-foreground">Opened: {{ openedIssue ?? "none" }}</div>
    `,
  }),
};
