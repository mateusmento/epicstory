import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import IssueGithubWorkflowPanel from "../IssueGithubWorkflowPanel.vue";
import {
  storyGithubAccess,
  storyGithubWorkflowMutation,
  storyLinkedBranches,
} from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueGithubWorkflowPanel",
  component: IssueGithubWorkflowPanel,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[520px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueGithubWorkflowPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueGithubWorkflowPanel },
    setup() {
      const selectedLinkedBranchId = ref<number | null>(storyLinkedBranches[0]!.id);
      const openPrAsDraft = ref(true);
      const createBranchDialogOpen = ref(false);
      const lastOpenPull = ref("none");

      const linkedBranches = computed(() => ({
        data: storyLinkedBranches,
        loading: false,
        error: null,
      }));

      const selectedLinkedBranch = computed(
        () => linkedBranches.value.data?.find((branch) => branch.id === selectedLinkedBranchId.value) ?? null,
      );

      function onOpenGithubPull(payload: { owner: string; repoName: string; branchName: string }) {
        lastOpenPull.value = `${payload.owner}/${payload.repoName}:${payload.branchName}`;
      }

      return {
        access: storyGithubAccess,
        mutation: storyGithubWorkflowMutation,
        formVisible: true,
        linkedBranches,
        selectedLinkedBranch,
        selectedLinkedBranchId,
        openPrAsDraft,
        createBranchDialogOpen,
        lastOpenPull,
        onOpenGithubPull,
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueGithubWorkflowPanel
          :access="access"
          :form-visible="formVisible"
          :linked-branches="linkedBranches"
          :mutation="mutation"
          :selected-linked-branch="selectedLinkedBranch"
          v-model:selected-linked-branch-id="selectedLinkedBranchId"
          v-model:open-pr-as-draft="openPrAsDraft"
          v-model:create-branch-dialog-open="createBranchDialogOpen"
          @open-github-pull="onOpenGithubPull"
        />
        <div class="text-xs text-muted-foreground">
          Last open PR action: {{ lastOpenPull }}
        </div>
      </div>
    `,
  }),
};
