import { withStoryContainer } from "@/presentationals/stories/story-container";
import { groupGithubPullRequests } from "@/lib/github";
import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import IssueCreateGithubBranchDialog from "@/presentationals/issue/IssueCreateGithubBranchDialog.vue";
import IssueGithubPullRequestsList from "@/presentationals/issue/IssueGithubPullRequestsList.vue";
import IssueGithubSidebar from "@/presentationals/issue/IssueGithubSidebar.vue";
import IssueGithubWorkflowPanel from "@/presentationals/issue/IssueGithubWorkflowPanel.vue";
import IssueSelectGithubRepoDialog from "@/presentationals/issue/IssueSelectGithubRepoDialog.vue";
import {
  storyGithubAccess,
  storyGithubRepoList,
  storyGithubRepos,
  storyGithubWorkflowMutation,
  storyIssue,
  storyIssuePullRequests,
  storyLinkedBranches,
} from "@/presentationals/issue/stories/issue-story.fixtures";

const meta = {
  title: "Product/Hero/IssueGithubPanel",
  component: IssueGithubSidebar,
  tags: ["autodocs"],
  decorators: [withStoryContainer("w-[560px]")],
} satisfies Meta<typeof IssueGithubSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderGithubPanel(options: {
  prData: typeof storyIssuePullRequests;
  prLoading?: boolean;
  prError?: string | null;
}) {
  return {
    components: {
      IssueGithubSidebar,
      IssueGithubPullRequestsList,
      IssueGithubWorkflowPanel,
      IssueCreateGithubBranchDialog,
      IssueSelectGithubRepoDialog,
    },
    setup() {
      const prStatusFilter = ref<"all" | "open" | "merged" | "closed">("all");
      const selectedLinkedBranchId = ref<number | null>(storyLinkedBranches[0]!.id);
      const openPrAsDraft = ref(false);
      const createBranchDialogOpen = ref(false);
      const repoPickerOpen = ref(false);
      const selectedRepoForCreate = ref(storyGithubRepos[0]!);
      const searchQuery = ref("");
      const lastAction = ref("none");

      const pr = computed(() => ({
        data: options.prData,
        loading: options.prLoading ?? false,
        error: options.prError ?? null,
        groups: groupGithubPullRequests(options.prData, prStatusFilter.value),
      }));

      const linkedBranches = computed(() => ({
        data: storyLinkedBranches,
        loading: false,
        error: null,
      }));

      const selectedLinkedBranch = computed(
        () => linkedBranches.value.data?.find((branch) => branch.id === selectedLinkedBranchId.value) ?? null,
      );

      const repoList = computed(() => ({
        ...storyGithubRepoList,
        items: storyGithubRepoList.items,
      }));

      return {
        issue: storyIssue,
        access: storyGithubAccess,
        mutation: storyGithubWorkflowMutation,
        pr,
        prStatusFilter,
        linkedBranches,
        selectedLinkedBranch,
        selectedLinkedBranchId,
        openPrAsDraft,
        createBranchDialogOpen,
        repoPickerOpen,
        selectedRepoForCreate,
        repoList,
        searchQuery,
        lastAction,
        onCreateBranch: (payload: { repo: (typeof storyGithubRepos)[number]; branchName: string }) => {
          selectedRepoForCreate.value = payload.repo;
          createBranchDialogOpen.value = false;
          lastAction.value = `create:${payload.repo.fullName}:${payload.branchName}`;
        },
        onOpenGithubPull: (payload: { owner: string; repoName: string; branchName: string }) => {
          lastAction.value = `open-pr:${payload.owner}/${payload.repoName}:${payload.branchName}`;
        },
        onRepoSelected: (repo: (typeof storyGithubRepos)[number]) => {
          selectedRepoForCreate.value = repo;
          repoPickerOpen.value = false;
        },
      };
    },
    template: `
      <div class="flex flex-col gap-2 p-2">
        <IssueGithubSidebar :show-github-section="true">
          <template #pull-requests>
            <IssueGithubPullRequestsList
              :issue="issue"
              :pr="pr"
              v-model:pr-status-filter="prStatusFilter"
            />
          </template>
          <template #workflow>
            <IssueGithubWorkflowPanel
              :access="access"
              :form-visible="true"
              :linked-branches="linkedBranches"
              :mutation="mutation"
              :selected-linked-branch="selectedLinkedBranch"
              v-model:selected-linked-branch-id="selectedLinkedBranchId"
              v-model:open-pr-as-draft="openPrAsDraft"
              v-model:create-branch-dialog-open="createBranchDialogOpen"
              @open-github-pull="onOpenGithubPull"
            />
          </template>
          <template #create-branch-dialog>
            <IssueCreateGithubBranchDialog
              v-model:open="createBranchDialogOpen"
              :selected-repo="selectedRepoForCreate"
              :initial-branch-name="issue.issueKey + '-storybook'"
              @open-repo-picker="repoPickerOpen = true"
              @create="onCreateBranch"
            />
            <IssueSelectGithubRepoDialog
              v-model:open="repoPickerOpen"
              v-model:search-query="searchQuery"
              :selected-repo-github-id="selectedRepoForCreate.githubRepoId"
              :list="repoList"
              @selected="onRepoSelected"
            />
          </template>
        </IssueGithubSidebar>
        <div class="text-xs text-muted-foreground">Last action: {{ lastAction }}</div>
      </div>
    `,
  };
}

export const Default: Story = {
  render: () => renderGithubPanel({ prData: storyIssuePullRequests }),
};

export const EmptyPullRequests: Story = {
  render: () => renderGithubPanel({ prData: [] }),
};

export const LoadingPullRequests: Story = {
  render: () => renderGithubPanel({ prData: [], prLoading: true }),
};

export const Interactive: Story = {
  render: () => renderGithubPanel({ prData: storyIssuePullRequests }),
};
