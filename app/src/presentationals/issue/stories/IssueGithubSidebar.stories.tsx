import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import { groupGithubPullRequests } from "@/lib/github";
import IssueCreateGithubBranchDialog from "../IssueCreateGithubBranchDialog.vue";
import IssueGithubPullRequestsList from "../IssueGithubPullRequestsList.vue";
import IssueGithubSidebar from "../IssueGithubSidebar.vue";
import IssueGithubWorkflowPanel from "../IssueGithubWorkflowPanel.vue";
import IssueSelectGithubRepoDialog from "../IssueSelectGithubRepoDialog.vue";
import {
  storyGithubAccess,
  storyGithubRepoList,
  storyGithubRepos,
  storyGithubWorkflowMutation,
  storyIssue,
  storyIssuePullRequests,
  storyLinkedBranches,
} from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueGithubSidebar",
  component: IssueGithubSidebar,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[560px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueGithubSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WiredSlotsHarness: Story = {
  render: () => ({
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
        data: storyIssuePullRequests,
        loading: false,
        error: null,
        groups: groupGithubPullRequests(storyIssuePullRequests, prStatusFilter.value),
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
        items: storyGithubRepoList.items.filter((repo) => {
          const q = searchQuery.value.trim().toLowerCase();
          if (!q) return true;
          return `${repo.fullName} ${repo.owner} ${repo.name}`.toLowerCase().includes(q);
        }),
      }));

      function onCreateBranch(payload: { repo: (typeof storyGithubRepos)[number]; branchName: string }) {
        selectedRepoForCreate.value = payload.repo;
        createBranchDialogOpen.value = false;
        lastAction.value = `create:${payload.repo.fullName}:${payload.branchName}`;
      }

      function onOpenGithubPull(payload: { owner: string; repoName: string; branchName: string }) {
        lastAction.value = `open-pr:${payload.owner}/${payload.repoName}:${payload.branchName}`;
      }

      function onRepoSelected(repo: (typeof storyGithubRepos)[number]) {
        selectedRepoForCreate.value = repo;
        repoPickerOpen.value = false;
      }

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
        onCreateBranch,
        onOpenGithubPull,
        onRepoSelected,
      };
    },
    template: `
      <div class="flex flex-col gap-2">
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
  }),
};
