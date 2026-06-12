import type { Meta, StoryObj } from "@storybook/vue3";
import { Button } from "@/design-system";
import { ref } from "vue";
import IssueLabelsDropdown from "../IssueLabelsDropdown.vue";
import { storyLabels } from "@/presentationals/stories/fixtures";

const meta = {
  title: "Presentational/Issue/IssueLabelsDropdown",
  component: IssueLabelsDropdown,
  tags: ["autodocs"],
  decorators: [() => ({ template: '<div class="p-4 bg-background"><story /></div>' })],
} satisfies Meta<typeof IssueLabelsDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { IssueLabelsDropdown, Button },
    setup() {
      const selectedIds = ref<number[]>([storyLabels[0]!.id, storyLabels[2]!.id]);
      return { selectedIds, catalog: storyLabels };
    },
    template: `
      <div class="flex flex-col gap-3">
        <IssueLabelsDropdown v-model="selectedIds" :catalog="catalog">
          <template #default="{ selectedLabels }">
            <Button type="button" variant="outline" size="sm">
              Labels ({{ selectedLabels.length }})
            </Button>
          </template>
        </IssueLabelsDropdown>
        <div class="text-xs text-muted-foreground">Selected ids: {{ selectedIds.join(', ') }}</div>
      </div>
    `,
  }),
};
