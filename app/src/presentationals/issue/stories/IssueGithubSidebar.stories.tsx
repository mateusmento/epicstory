import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import { groupIssueDevelopmentItems } from "@/lib/github";
import IssueCreateGithubBranchDialog from "../IssueCreateGithubBranchDialog.vue";
import IssueGithubDevelopmentList from "../IssueGithubDevelopmentList.vue";
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

      const branches = computed(() => ({
        data: storyLinkedBranches,
        loading: false,
        error: null,
      }));

      const pullRequests = computed(() => ({
        data: storyIssuePullRequests,
        loading: false,
        error: null,
      }));

      const groups = computed(() =>
        groupIssueDevelopmentItems(
          storyLinkedBranches,
          storyIssuePullRequests,
          prStatusFilter.value,
        ),
      );

      const repoList = computed(() => ({
        ...storyGithubRepoList,
        items: storyGithubRepoList.items.filter((repo) => {
          const q = searchQuery.value.trim().toLowerCase();
          if (!q) return true;
          return `${repo.fullName} ${repo.owner} ${repo.name}`.toLowerCase().includes(q);
        }),
      }));

      return {
        issue: storyIssue,
        access: storyGithubAccess,
        mutation: storyGithubWorkflowMutation,
        groups,
        branches,
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
      <div class="flex flex-col gap-2">
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
              :branches="branches"
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
  }),
};
