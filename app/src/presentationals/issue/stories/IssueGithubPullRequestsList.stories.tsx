import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import { groupGithubPullRequests } from "@/lib/github";
import IssueGithubPullRequestsList from "../IssueGithubPullRequestsList.vue";
import { storyIssue, storyIssuePullRequests } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueGithubPullRequestsList",
  component: IssueGithubPullRequestsList,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[520px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueGithubPullRequestsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueGithubPullRequestsList },
    setup() {
      const prStatusFilter = ref<"all" | "open" | "merged" | "closed">("all");
      const pr = computed(() => ({
        data: storyIssuePullRequests,
        loading: false,
        error: null,
        groups: groupGithubPullRequests(storyIssuePullRequests, prStatusFilter.value),
      }));

      return { issue: storyIssue, prStatusFilter, pr };
    },
    template: `
      <IssueGithubPullRequestsList
        :issue="issue"
        :pr="pr"
        v-model:pr-status-filter="prStatusFilter"
      />
    `,
  }),
};
