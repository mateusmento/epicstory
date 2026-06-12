import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { computed, ref } from "vue";
import IssueSelectGithubRepoDialog from "../IssueSelectGithubRepoDialog.vue";
import { storyGithubRepoList, storyGithubRepos } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueSelectGithubRepoDialog",
  component: IssueSelectGithubRepoDialog,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueSelectGithubRepoDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueSelectGithubRepoDialog, Button },
    setup() {
      const open = ref(true);
      const selectedRepoGithubId = ref<string | null>(storyGithubRepos[0]!.githubRepoId);
      const searchQuery = ref("");
      const items = ref([...storyGithubRepoList.items]);
      const hasMore = ref(true);
      const selectedLabel = ref("none");

      const list = computed(() => ({
        items: items.value.filter((repo) => {
          const q = searchQuery.value.trim().toLowerCase();
          if (!q) return true;
          return `${repo.fullName} ${repo.owner} ${repo.name}`.toLowerCase().includes(q);
        }),
        loading: false,
        loadingMore: false,
        hasMore: hasMore.value,
        error: null,
      }));

      function onSelected(repo: (typeof items.value)[number]) {
        selectedRepoGithubId.value = repo.githubRepoId;
        selectedLabel.value = repo.fullName;
      }

      function onLoadMore() {
        if (!hasMore.value) return;
        items.value = [...items.value, ...storyGithubRepos.map((repo) => ({ ...repo, githubRepoId: `${repo.githubRepoId}-next` }))];
        hasMore.value = false;
      }

      return {
        open,
        selectedRepoGithubId,
        searchQuery,
        list,
        selectedLabel,
        onSelected,
        onLoadMore,
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" @click="open = true">Open repo picker</Button>
        <IssueSelectGithubRepoDialog
          v-model:open="open"
          v-model:search-query="searchQuery"
          :selected-repo-github-id="selectedRepoGithubId"
          :list="list"
          @selected="onSelected"
          @load-more="onLoadMore"
        />
        <div class="text-xs text-muted-foreground">Selected repository: {{ selectedLabel }}</div>
      </div>
    `,
  }),
};
