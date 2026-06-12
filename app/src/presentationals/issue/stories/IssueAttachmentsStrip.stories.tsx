import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import IssueAttachmentsStrip from "../IssueAttachmentsStrip.vue";
import { storyIssueAttachmentRows } from "./issue-story.fixtures";

const meta = {
  title: "Presentational/Issue/IssueAttachmentsStrip",
  component: IssueAttachmentsStrip,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[560px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueAttachmentsStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueAttachmentsStrip },
    setup() {
      const rows = ref([...storyIssueAttachmentRows]);
      const uploadInProgress = ref(false);
      const removingAttachmentId = ref<number | null>(null);
      const droppedCount = ref(0);

      const attachments = computed(() => ({
        data: rows.value,
        loading: false,
        error: null,
      }));

      async function onRemove(id: number) {
        removingAttachmentId.value = id;
        rows.value = rows.value.filter((row) => row.kind !== "persisted" || row.item.id !== id);
        removingAttachmentId.value = null;
      }

      function onDismiss(clientId: string) {
        rows.value = rows.value.filter((row) => row.kind === "persisted" || row.clientId !== clientId);
      }

      function onFilesDropped(files: File[]) {
        droppedCount.value += files.length;
      }

      return {
        attachments,
        uploadInProgress,
        removingAttachmentId,
        droppedCount,
        onRemove,
        onDismiss,
        onFilesDropped,
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueAttachmentsStrip
          :attachments="attachments"
          droppable
          :upload-in-progress="uploadInProgress"
          :removing-attachment-id="removingAttachmentId"
          :me-id="1"
          @remove="onRemove"
          @dismiss-pending="onDismiss"
          @files-dropped="onFilesDropped"
        />
        <div class="text-xs text-muted-foreground">Dropped files: {{ droppedCount }}</div>
      </div>
    `,
  }),
};
