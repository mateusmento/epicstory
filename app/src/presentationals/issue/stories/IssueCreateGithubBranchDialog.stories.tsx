import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { ref } from "vue";
import IssueCreateGithubBranchDialog from "../IssueCreateGithubBranchDialog.vue";
import { storyGithubRepos } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueCreateGithubBranchDialog",
  component: IssueCreateGithubBranchDialog,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueCreateGithubBranchDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueCreateGithubBranchDialog, Button },
    setup() {
      const open = ref(true);
      const selectedRepo = ref(storyGithubRepos[0]!);
      const lastCreate = ref("none");

      function onOpenRepoPicker() {
        selectedRepo.value = selectedRepo.value.githubRepoId === storyGithubRepos[0]!.githubRepoId
          ? storyGithubRepos[1]!
          : storyGithubRepos[0]!;
      }

      function onCreate(payload: { repo: (typeof storyGithubRepos)[number]; branchName: string }) {
        lastCreate.value = `${payload.repo.fullName}:${payload.branchName}`;
      }

      return { open, selectedRepo, onOpenRepoPicker, onCreate, lastCreate };
    },
    template: `
      <div class="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" @click="open = true">Open create branch dialog</Button>
        <IssueCreateGithubBranchDialog
          v-model:open="open"
          :selected-repo="selectedRepo"
          initial-branch-name="EP-42-storybook-wiring"
          @open-repo-picker="onOpenRepoPicker"
          @create="onCreate"
        />
        <div class="text-xs text-muted-foreground">Last create: {{ lastCreate }}</div>
      </div>
    `,
  }),
};
