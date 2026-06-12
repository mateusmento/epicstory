import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import IssueAttachmentTilesList from "../IssueAttachmentTilesList.vue";
import { storyIssueAttachmentRows } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueAttachmentTilesList",
  component: IssueAttachmentTilesList,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[520px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueAttachmentTilesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueAttachmentTilesList },
    setup() {
      const rows = ref([...storyIssueAttachmentRows]);
      const log = ref("none");

      function onRemove(attachmentId: number) {
        rows.value = rows.value.filter((row) => row.kind !== "persisted" || row.item.id !== attachmentId);
        log.value = `remove:${attachmentId}`;
      }

      function onDismiss(clientId: string) {
        rows.value = rows.value.filter(
          (row) => row.kind === "persisted" || row.clientId !== clientId,
        );
        log.value = `dismiss:${clientId}`;
      }

      return { rows, log, onRemove, onDismiss };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueAttachmentTilesList
          :rows="rows"
          removable
          :me-id="1"
          @remove="onRemove"
          @dismiss-pending="onDismiss"
        />
        <div class="text-xs text-muted-foreground">Last action: {{ log }}</div>
      </div>
    `,
  }),
};
