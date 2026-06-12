import IssueLabelTags from "../IssueLabelTags.vue";
import { storyLabels } from "@/presentationals/stories/fixtures";
import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";

const meta = {
  title: "Presentational/Issue/IssueLabelTags",
  component: IssueLabelTags,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div class="w-72 p-4"><story /></div>',
    }),
  ],
} satisfies Meta<typeof IssueLabelTags>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueLabelTags },
    setup() {
      const selectedIds = ref<number[]>([1, 2]);
      const lastAction = ref<string | null>(null);
      return {
        catalog: storyLabels,
        selectedIds,
        lastAction,
        onAdd: (id: number) => {
          if (!selectedIds.value.includes(id)) {
            selectedIds.value = [...selectedIds.value, id];
          }
          lastAction.value = `add-label:${id}`;
        },
        onRemove: (id: number) => {
          selectedIds.value = selectedIds.value.filter((x) => x !== id);
          lastAction.value = `remove-label:${id}`;
        },
      };
    },
    template: `
      <div class="flex flex-col gap-2">
        <IssueLabelTags
          v-model="selectedIds"
          :catalog="catalog"
          @add-label="onAdd"
          @remove-label="onRemove"
        />
        <div class="text-xs text-muted-foreground">
          Selected: [{{ selectedIds.join(', ') }}]
          <span v-if="lastAction"> · {{ lastAction }}</span>
        </div>
      </div>
    `,
  }),
};

export const Empty: Story = {
  render: () => ({
    components: { IssueLabelTags },
    setup() {
      const selectedIds = ref<number[]>([]);
      return { catalog: storyLabels, selectedIds };
    },
    template: `
      <IssueLabelTags v-model="selectedIds" :catalog="catalog" />
    `,
  }),
};

export const ManyLabelsOverflow: Story = {
  render: () => ({
    components: { IssueLabelTags },
    setup() {
      const selectedIds = ref(storyLabels.map((l) => l.id));
      return { catalog: storyLabels, selectedIds };
    },
    template: `
      <IssueLabelTags v-model="selectedIds" :catalog="catalog" />
    `,
  }),
  decorators: [
    () => ({
      template: '<div class="w-40 p-4"><story /></div>',
    }),
  ],
};
