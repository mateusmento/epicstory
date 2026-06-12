import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { ref } from "vue";
import IssueDeleteDialog from "../IssueDeleteDialog.vue";
import { storyIssue } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueDeleteDialog",
  component: IssueDeleteDialog,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueDeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueDeleteDialog, Button },
    setup() {
      const open = ref(true);
      const deleteCount = ref(0);

      function onConfirm() {
        deleteCount.value += 1;
      }

      return { open, deleteCount, onConfirm, title: storyIssue.title };
    },
    template: `
      <div class="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" @click="open = true">Open delete dialog</Button>
        <IssueDeleteDialog v-model:open="open" :title="title" @confirm="onConfirm" />
        <div class="text-xs text-muted-foreground">Delete confirmations: {{ deleteCount }}</div>
      </div>
    `,
  }),
};
