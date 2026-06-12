import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import AttachmentTilesList from "../AttachmentTilesList.vue";
import { makeAttachmentRows } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/AttachmentTilesList",
  component: AttachmentTilesList,
  tags: ["autodocs"],
} satisfies Meta<typeof AttachmentTilesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => ({
    components: { AttachmentTilesList },
    setup() {
      const rows = ref(makeAttachmentRows());
      const rowKeys = computed(() => rows.value.map((row) => row.key).join(", "));
      function onRemove(id: number) {
        rows.value = rows.value.filter((row) => row.kind !== "uploaded" || row.attachment.id !== id);
      }
      function onDismissPending(clientId: string) {
        rows.value = rows.value.filter((row) => !("clientId" in row) || row.clientId !== clientId);
      }
      return { rows, rowKeys, onRemove, onDismissPending };
    },
    template: `
      <div class="max-w-xl p-4">
        <AttachmentTilesList
          :rows="rows"
          removable
          :me-id="3"
          @remove="onRemove"
          @dismiss-pending="onDismissPending"
        />
        <p class="mt-2 text-xs text-muted-foreground">Rows: {{ rowKeys || "none" }}</p>
      </div>
    `,
  }),
};
