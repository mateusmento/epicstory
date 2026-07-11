import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import { groupIssueDevelopmentItems } from "@/lib/github";
import type { IGithubIssueBranchLink, IGithubIssuePullRequestLink } from "@epicstory/contracts";
import IssueGithubDevelopmentList from "../IssueGithubDevelopmentList.vue";
import { storyIssue, storyIssuePullRequests, storyLinkedBranches } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueGithubDevelopmentList",
  component: IssueGithubDevelopmentList,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[520px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueGithubDevelopmentList>;

export default meta;
type Story = StoryObj<typeof meta>;

function listStory(
  branches: IGithubIssueBranchLink[],
  pullRequests: IGithubIssuePullRequestLink[],
  filter: "all" | "open" | "merged" | "closed" = "open",
): Story {
  return {
    render: () => ({
      components: { IssueGithubDevelopmentList },
      setup() {
        const prStatusFilter = ref(filter);
        const lastAction = ref("none");
        const branchView = computed(() => ({ data: branches, loading: false, error: null }));
        const prView = computed(() => ({ data: pullRequests, loading: false, error: null }));
        const groups = computed(() =>
          groupIssueDevelopmentItems(branches, pullRequests, prStatusFilter.value),
        );

        return {
          issue: storyIssue,
          groups,
          branchView,
          prView,
          prStatusFilter,
          lastAction,
          onOpenPull: (payload: { owner: string; repoName: string; branchName: string; draft: boolean }) => {
            lastAction.value = `${payload.draft ? "draft" : "pr"}:${payload.owner}/${payload.repoName}:${payload.branchName}`;
          },
        };
      },
      template: `
        <div class="flex flex-col gap-2">
          <IssueGithubDevelopmentList
            :groups="groups"
            :branches="branchView"
            :pull-requests="prView"
            :can-open-pull="true"
            :issue-key-hint="issue.issueKey"
            v-model:pr-status-filter="prStatusFilter"
            @open-pull="onOpenPull"
          />
          <div class="text-xs text-muted-foreground">Last action: {{ lastAction }}</div>
        </div>
      `,
    }),
  };
}

export const MultiRepoMatchedAndBranchOnly = listStory(storyLinkedBranches, storyIssuePullRequests, "open");

export const BranchOnly = listStory(
  [
    {
      id: 99,
      owner: "epicstory",
      repoName: "epicstory",
      branchName: "EP-42-no-pr-yet",
      fullName: "epicstory/epicstory",
      htmlUrl: "https://github.com/epicstory/epicstory/tree/EP-42-no-pr-yet",
      source: "webhook_push",
      firstLinkedAt: "2026-06-10T20:00:00.000Z",
      lastPushedAt: "2026-06-10T20:20:00.000Z",
    },
  ],
  [],
  "open",
);

export const MatchedPrOnly = listStory([storyLinkedBranches[0]!], [storyIssuePullRequests[0]!], "open");
