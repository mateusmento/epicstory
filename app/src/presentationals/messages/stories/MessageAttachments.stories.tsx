import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref } from "vue";
import MessageAttachments from "../MessageAttachments.vue";
import { storyAttachments } from "./message.fixtures";

const meta = {
  title: "Presentational/Messages/MessageAttachments",
  component: MessageAttachments,
  tags: ["autodocs"],
} satisfies Meta<typeof MessageAttachments>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Removable: Story = {
  render: () => ({
    components: { MessageAttachments },
    setup() {
      const files = ref([...storyAttachments]);
      const ids = computed(() => files.value.map((f) => f.id).join(", "));
      function onRemove(id: number) {
        files.value = files.value.filter((f) => f.id !== id);
      }
      return { files, ids, onRemove };
    },
    template: `
      <div class="max-w-xl p-4">
        <MessageAttachments :files="files" removable :me-id="3" hint="Hover to remove your own uploads" @remove="onRemove" />
        <p class="mt-2 text-xs text-muted-foreground">Visible attachment ids: {{ ids || "none" }}</p>
      </div>
    `,
  }),
};
