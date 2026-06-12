import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { ref } from "vue";
import IssueRenameDialog from "../IssueRenameDialog.vue";
import { storyIssue } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueRenameDialog",
  component: IssueRenameDialog,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueRenameDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueRenameDialog, Button },
    setup() {
      const open = ref(true);
      const currentTitle = ref(storyIssue.title);
      const savedCount = ref(0);

      function onConfirm(nextTitle: string) {
        currentTitle.value = nextTitle;
        savedCount.value += 1;
      }

      return { open, currentTitle, savedCount, onConfirm };
    },
    template: `
      <div class="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" @click="open = true">Open rename dialog</Button>
        <IssueRenameDialog
          v-model:open="open"
          :current-title="currentTitle"
          @confirm="onConfirm"
        />
        <div class="text-xs text-muted-foreground">Saved {{ savedCount }} time(s): {{ currentTitle }}</div>
      </div>
    `,
  }),
};
