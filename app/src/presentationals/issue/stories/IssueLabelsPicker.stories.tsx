import { DropdownMenuPanel } from "@/presentationals/stories/harness/DropdownMenuPanel";
import { storyLabels } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import IssueLabelsPicker from "../IssueLabelsPicker.vue";

const meta = {
  title: "Presentational/Issue/IssueLabelsPicker",
  component: IssueLabelsPicker,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="w-[320px] p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueLabelsPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueLabelsPicker, DropdownMenuPanel },
    setup() {
      const selectedIds = ref<number[]>([storyLabels[0]!.id]);
      const lastAction = ref<string>("none");

      function onAddLabel(id: number) {
        lastAction.value = `add:${id}`;
      }

      function onRemoveLabel(id: number) {
        lastAction.value = `remove:${id}`;
      }

      return { selectedIds, lastAction, onAddLabel, onRemoveLabel, catalog: storyLabels };
    },
    template: `
      <div class="flex flex-col gap-2">
        <DropdownMenuPanel content-class="w-[320px]">
          <IssueLabelsPicker
            v-model="selectedIds"
            :catalog="catalog"
            @add-label="onAddLabel"
            @remove-label="onRemoveLabel"
          />
        </DropdownMenuPanel>
        <div class="text-xs text-muted-foreground">
          Selected: {{ selectedIds.join(', ') || 'none' }} · Last: {{ lastAction }}
        </div>
      </div>
    `,
  }),
};
