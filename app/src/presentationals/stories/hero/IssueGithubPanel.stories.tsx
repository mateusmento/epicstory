import { withStoryContainer } from "@/presentationals/stories/story-container";
import { groupIssueDevelopmentItems } from "@/lib/github";
import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import IssueCreateGithubBranchDialog from "@/presentationals/issue/IssueCreateGithubBranchDialog.vue";
import IssueGithubDevelopmentList from "@/presentationals/issue/IssueGithubDevelopmentList.vue";
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
  branches?: typeof storyLinkedBranches;
  prLoading?: boolean;
  prError?: string | null;
}) {
  const branches = options.branches ?? storyLinkedBranches;
  return {
    components: {
      IssueGithubSidebar,
      IssueGithubDevelopmentList,
      IssueGithubWorkflowPanel,
      IssueCreateGithubBranchDialog,
      IssueSelectGithubRepoDialog,
    },
    setup() {
      const prStatusFilter = ref<"all" | "open" | "merged" | "closed">("open");
      const createBranchDialogOpen = ref(false);
      const repoPickerOpen = ref(false);
      const selectedRepoForCreate = ref(storyGithubRepos[0]!);
      const searchQuery = ref("");
      const lastAction = ref("none");

      const branchView = computed(() => ({
        data: branches,
        loading: false,
        error: null,
      }));

      const pullRequests = computed(() => ({
        data: options.prData,
        loading: options.prLoading ?? false,
        error: options.prError ?? null,
      }));

      const groups = computed(() =>
        groupIssueDevelopmentItems(branches, options.prData, prStatusFilter.value),
      );

      const repoList = computed(() => ({
        ...storyGithubRepoList,
        items: storyGithubRepoList.items,
      }));

      return {
        issue: storyIssue,
        access: storyGithubAccess,
        mutation: storyGithubWorkflowMutation,
        groups,
        branchView,
        pullRequests,
        prStatusFilter,
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
        onOpenPull: (payload: {
          owner: string;
          repoName: string;
          branchName: string;
          draft: boolean;
        }) => {
          lastAction.value = `open-pr${payload.draft ? "-draft" : ""}:${payload.owner}/${payload.repoName}:${payload.branchName}`;
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
          <template #banners>
            <IssueGithubWorkflowPanel
              :access="access"
              :form-visible="true"
              :mutation="mutation"
            />
          </template>
          <template #list>
            <IssueGithubDevelopmentList
              :groups="groups"
              :branches="branchView"
              :pull-requests="pullRequests"
              :can-open-pull="true"
              :issue-key-hint="issue.issueKey"
              v-model:pr-status-filter="prStatusFilter"
              @open-pull="onOpenPull"
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
